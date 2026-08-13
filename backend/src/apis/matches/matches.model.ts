import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'
import { ShopSchema, type Shop } from '../shop/shop.model.ts'
import { selectPreferencesByProfileId } from '../preferences/preference.model.ts'
import {
    MATCH_QUALITIES,
    bandFor,
    scoreShop,
    toMatchScore
} from '../../utils/matching.utils.ts'

//
// A match is computed, never stored — there is no match table. It is a shop
// plus how well that shop fits the requesting profile's preferences, so it
// changes as either the profile's preferences or anybody's ratings change.
//
// The scoring itself lives in utils/matching.utils.ts; this file is the
// aggregation that feeds it. See documentation/matching-api-plan.md.

export const ShopMatchModel = ShopSchema.extend({
    // 0-100, higher is a closer match. The ranking key — clients are expected
    // to render matchQuality instead of this number.
    matchScore: z.number('Please provide a valid match score').int().min(0).max(100),
    matchQuality: z.enum(MATCH_QUALITIES),
    // how much evidence is behind the score, so the UI can say "based on 2 of
    // your 6 preferences" rather than implying the number is authoritative
    ratedInterestCount: z.number('Please provide a valid rated interest count').int().min(0),
    preferenceCount: z.number('Please provide a valid preference count').int().min(1)
})

export type ShopMatch = z.infer<typeof ShopMatchModel>

// AVG() over a numeric column comes back as a string from the driver, same
// reason RatingRowModel and PreferenceRowModel coerce.
//
// `average` is deliberately NOT bounded to 1-5 here. rating.value has no CHECK
// constraint (sql/project.sql declares it a bare decimal), so one bad legacy
// row would otherwise reject this parse and 500 the matches endpoint for
// everybody. normalizeRating clamps instead, which degrades that row to a
// boundary value rather than taking the whole feature down.
const ShopInterestAverageRowModel = z.object({
    shopId: z.uuidv7('Please provide a valid uuid for shopId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    average: z.coerce.number('Please provide a valid average')
})

//
// average each shop's rating per interest, one vote per person
//
// The DISTINCT ON block is the same collapsing selectTagListings uses
// (apis/tags/tags.model.ts): it keeps one row per (shop, interest, profile) —
// the newest visit that rated that interest — so somebody who visits five
// times does not outvote five people who visited once. The visit.id tiebreak
// matters because two visits can share a created_at, and without it the
// surviving row is arbitrary and the score flickers between requests.
//
// Because DISTINCT ON reads only rows that HAVE a rating for the interest, a
// rater whose newest visit skipped an interest still contributes their earlier
// score for it — only a newer score for the same interest supersedes it.
//
// Filtered to the interests the profile actually weighted, since nothing else
// affects the score.
//
// @param interestIds the profile's weighted interest ids
// @returns one average per (shop, interest) pair that has any rating at all

async function selectShopInterestAverages (interestIds: string[]): Promise<Array<z.infer<typeof ShopInterestAverageRowModel>>> {
    const rowList = await sql`
        WITH latest AS (
            SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
                   visit.shop_id,
                   rating.interest_id,
                   visit.profile_id,
                   rating.value
            FROM rating
            JOIN visit ON visit.id = rating.visit_id
            WHERE rating.interest_id = ANY(${interestIds})
            ORDER BY visit.shop_id,
                     rating.interest_id,
                     visit.profile_id,
                     visit.created_at DESC,
                     visit.id DESC
        )
        SELECT latest.shop_id,
               latest.interest_id,
               AVG(latest.value) AS average
        FROM latest
        GROUP BY latest.shop_id, latest.interest_id
    `
    return ShopInterestAverageRowModel.array().parse(rowList)
}

//
// load the shops that scored, and only those
//
// @param shopIds ids that appeared in the aggregation
// @returns the shop rows

async function selectShopsByIds (shopIds: string[]): Promise<Shop[]> {
    const rowList = await sql`
        SELECT id, address, hours, lat, lng, name, phone, image_url
        FROM shop
        WHERE id = ANY(${shopIds})
    `
    return ShopSchema.array().parse(rowList)
}

//
// rank shops by how well they match a profile's preferences
//
// Only shops with at least one real rating on an interest the profile weighted
// are considered — a shop scored entirely on neutral defaults carries no
// signal, so it is left out rather than ranked. That falls out of the
// aggregation for free: a shop with no such ratings produces no rows.
//
// @param profileId the profile to match for
// @param limit how many matches to return
// @returns matches, closest first, ties broken on shop name for a stable
//          order; empty when the profile has no preferences, weighted every
//          interest at 0, or no shop has an overlapping rating

export async function selectMatchesForProfile (profileId: string, limit: number): Promise<ShopMatch[]> {
    const preferences = await selectPreferencesByProfileId(profileId)

    // importance 0 is a real saved answer meaning "I don't care", so it is
    // dropped here rather than treated as unrated
    const weighted = preferences.filter(preference => preference.importance > 0)
    if (weighted.length === 0) {
        return []
    }

    const preferenceWeights: Record<string, number> = {}
    for (const preference of weighted) {
        preferenceWeights[preference.interestId] = preference.importance
    }

    const averages = await selectShopInterestAverages(Object.keys(preferenceWeights))
    if (averages.length === 0) {
        return []
    }

    // shopId -> (interestId -> average)
    const averagesByShop = new Map<string, Record<string, number>>()
    for (const row of averages) {
        const shopAverages = averagesByShop.get(row.shopId) ?? {}
        shopAverages[row.interestId] = row.average
        averagesByShop.set(row.shopId, shopAverages)
    }

    const shops = await selectShopsByIds([...averagesByShop.keys()])

    const scored = shops.flatMap(shop => {
        // ShopSchema types id as nullable; a shop without one cannot be keyed
        // back to its averages, and has no route to link to either
        if (shop.id === null) {
            return []
        }
        const score = scoreShop(preferenceWeights, averagesByShop.get(shop.id) ?? {})
        if (score === null) {
            return []
        }
        return [{ shop, score }]
    })

    // sort on the unrounded score so two shops that round to the same
    // percentage still order deterministically
    scored.sort((left, right) => {
        if (right.score.score01 !== left.score.score01) {
            return right.score.score01 - left.score.score01
        }
        return left.shop.name.localeCompare(right.shop.name)
    })

    const matches = scored.slice(0, limit).map(({ shop, score }) => {
        const matchScore = toMatchScore(score.score01)
        return {
            ...shop,
            matchScore,
            matchQuality: bandFor(matchScore, score.coverage),
            ratedInterestCount: score.ratedInterestCount,
            preferenceCount: score.preferenceCount
        }
    })

    return ShopMatchModel.array().parse(matches)
}
