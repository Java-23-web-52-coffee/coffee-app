import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'
import { InterestModel } from '../interest/interest.model.ts'

//
// A tag is derived, never stored — there is no tag table. A shop earns a tag
// on an interest when enough distinct people have rated that interest highly
// enough, so a tag appears and disappears as people rate the shop.
//
// Both thresholds live here so tuning them is a single edit.

// the average score an interest must reach before it is worth showing
export const TAG_MIN_AVERAGE = 4

// how many distinct profiles must be behind that average
export const TAG_MIN_RATERS = 3

// InterestModel allows a null id because the insert path mints one; a tag is
// always derived from an interest row that already exists, so narrow it here
// rather than pushing the null onto everyone reading a tag
const TagInterestModel = InterestModel.extend({
    id: z.uuidv7('Please provide a valid uuid for interestId')
})

// A tag carries the interest whole rather than restating its columns, so the
// interest half stays in one place: widen InterestModel and the tag endpoints
// follow.
export const ShopTagModel = z.object({
    interest: TagInterestModel,
    count: z.coerce.number('Please provide a valid count')
        .int()
        .min(TAG_MIN_RATERS)
})

export type ShopTag = z.infer<typeof ShopTagModel>

// the same tag, carrying the shop it belongs to — what the multi-shop
// endpoint returns, since one response covers many shops
export const ShopTagListingModel = ShopTagModel.extend({
    shopId: z.uuidv7('Please provide a valid uuid for shopId')
})

export type ShopTagListing = z.infer<typeof ShopTagListingModel>

// what the aggregation actually returns: one flat row per (shop, interest),
// which the select below folds into the nested shape above
const TagRowModel = z.object({
    shopId: z.uuidv7('Please provide a valid uuid for shopId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    category: z.string('Please provide a valid category'),
    count: z.coerce.number('Please provide a valid count')
        .int()
        .min(TAG_MIN_RATERS)
})

// the spine of every tag query, written once so the collapsing rule cannot
// drift between the queries that build on it
//
// Each rater contributes exactly one score per interest — their most recent
// one — so somebody who visits five times does not outvote five people who
// visited once. DISTINCT ON does that collapsing: it keeps the first row per
// (interest, profile) pair under the ORDER BY, which is the newest visit.
// The visit.id tiebreak matters because two visits can share a created_at,
// and without it the surviving row is arbitrary and the tag can flicker
// between requests.
//
// Note what DISTINCT ON reads from: rows that HAVE a rating for the interest.
// So when someone's newest visit skipped an interest, their earlier score for
// it still counts — only a newer score for the same interest supersedes it.
//
// This is the body of a CTE, not a whole statement: callers write
// `WITH ${latestRatingsCte()} SELECT …` so they can add CTEs of their own.
//
// @param shopIds narrows the scan to these shops, or undefined for every shop

// ts-standard sees postgres.js's PendingQuery as a promise and asks for an
// async function returning it. A fragment is never awaited on its own — it is
// interpolated into the statement that runs it, and awaiting it here would try
// to execute half a statement.
// eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/explicit-function-return-type
const latestRatingsCte = (shopIds?: string[]) => sql`
    latest AS (
        SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
               visit.shop_id,
               rating.interest_id,
               visit.profile_id,
               rating.value
        FROM rating
        JOIN visit ON visit.id = rating.visit_id
        ${shopIds === undefined ? sql`` : sql`WHERE visit.shop_id = ANY(${shopIds})`}
        ORDER BY visit.shop_id,
                 rating.interest_id,
                 visit.profile_id,
                 visit.created_at DESC,
                 visit.id DESC
    )
`

//
// select tags for one shop, several shops, or every shop
//
// Both tag endpoints run this one query so the thresholds cannot drift apart:
// the single-shop route passes one id, the multi-shop route passes a list or
// nothing at all.
//
// @param shopIds the shops to derive tags for, or undefined for every shop
// @returns qualifying tags grouped by shop, best average first within a shop;
//          empty when none qualify (which is also what an unknown shopId
//          produces — the single-shop controller tells those two apart, not
//          this query)

export async function selectTagListings (shopIds?: string[]): Promise<ShopTagListing[]> {
    const rowList = await sql`
        WITH ${latestRatingsCte(shopIds)}
        SELECT latest.shop_id,
               latest.interest_id,
               interest.category,
               COUNT(*)::int AS "count"
        FROM latest
        JOIN interest ON interest.id = latest.interest_id
        GROUP BY latest.shop_id, latest.interest_id, interest.category
        HAVING COUNT(*) >= ${TAG_MIN_RATERS}
           AND AVG(latest.value) >= ${TAG_MIN_AVERAGE}
        ORDER BY latest.shop_id, AVG(latest.value) DESC, interest.category
    `
    // COUNT() is bigint, which the driver hands back as a string to avoid
    // precision loss — the ::int cast above is what makes it a number, and
    // z.coerce covers the row if that cast is ever dropped.
    //
    // The average is deliberately not selected: it orders the results and
    // nothing else. The chip shows a label and a count, so publishing a
    // 4.4-vs-4.6 distinction would invite comparisons three raters cannot
    // support.
    return TagRowModel.array().parse(rowList).map(row => ({
        shopId: row.shopId,
        interest: { id: row.interestId, category: row.category },
        count: row.count
    }))
}

//
// select the tags a single shop currently qualifies for
//
// @param shopId the shop to derive tags for
// @returns the qualifying tags, best average first; shopId is dropped because
//          the caller already knows which shop it asked about

export async function selectTagsByShopId (shopId: string): Promise<ShopTag[]> {
    const listings = await selectTagListings([shopId])
    return listings.map(({ shopId, ...tag }) => tag)
}

// the shop id column on its own, for the filter below
const ShopIdRowModel = z.object({
    shopId: z.uuidv7('Please provide a valid uuid for shopId')
})

//
// select the shops that qualify for EVERY one of these interests
//
// The AND lives in COUNT(DISTINCT …) = the number of interests asked for: a
// shop that cleared only two of three selected tags never reaches the outer
// HAVING. Ids are deduped first, because a URL repeating ?interestId= would
// otherwise raise the required count above what any shop can reach and quietly
// return nothing.
//
// The qualified CTE is the same aggregation the tag endpoints run, sharing
// both thresholds — a shop matches on a tag here exactly when that tag would
// have been rendered on its card.
//
// @param interestIds the selected tags; an empty array is the caller's bug
//        (it would ask for "shops with none of no tags"), so the controller
//        short-circuits before calling this
// @returns the qualifying shop ids, unordered — shop.model owns result order

export async function selectShopIdsWithAllTags (interestIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(interestIds)]
    const rowList = await sql`
        WITH ${latestRatingsCte()},
        qualified AS (
            SELECT latest.shop_id,
                   latest.interest_id
            FROM latest
            GROUP BY latest.shop_id, latest.interest_id
            HAVING COUNT(*) >= ${TAG_MIN_RATERS}
               AND AVG(latest.value) >= ${TAG_MIN_AVERAGE}
        )
        SELECT qualified.shop_id
        FROM qualified
        WHERE qualified.interest_id = ANY(${uniqueIds})
        GROUP BY qualified.shop_id
        HAVING COUNT(DISTINCT qualified.interest_id) = ${uniqueIds.length}
    `
    return ShopIdRowModel.array().parse(rowList).map(row => row.shopId)
}
