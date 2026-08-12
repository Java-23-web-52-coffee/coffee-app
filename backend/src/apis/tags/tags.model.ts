import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'

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

export const ShopTagModel = z.object({
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    category: z.string('Please provide a valid category'),
    ratingCount: z.coerce.number('Please provide a valid rating count')
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

//
// select tags for one shop, several shops, or every shop
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
// Both endpoints run this one query so the thresholds cannot drift apart:
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
        WITH latest AS (
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
        SELECT latest.shop_id,
               latest.interest_id,
               interest.category,
               COUNT(*)::int AS rating_count
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
    return ShopTagListingModel.array().parse(rowList)
}

//
// select the tags a single shop currently qualifies for
//
// @param shopId the shop to derive tags for
// @returns the qualifying tags, best average first; shopId is dropped because
//          the caller already knows which shop it asked about

export async function selectTagsByShopId (shopId: string): Promise<ShopTag[]> {
    const listings = await selectTagListings([shopId])
    return listings.map(listing => ({
        interestId: listing.interestId,
        category: listing.category,
        ratingCount: listing.ratingCount
    }))
}
