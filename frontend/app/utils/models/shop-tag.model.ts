import {z} from "zod/v4";
import {InterestSchema} from "~/utils/models/interest.model";

// A tag is derived from visits and ratings rather than stored, so the shape
// is deliberately small: the interest it was earned on and the number of
// people behind it. The average that decides whether a tag qualifies (and
// what order the tags arrive in) stays on the server.
export const ShopTagSchema = z.object({
    // InterestSchema allows a null id for the insert path; a tag always came
    // from an interest row that exists
    interest: InterestSchema.extend({
        id: z.uuidv7("Please provide a valid interest id")
    }),
    // distinct profiles, not ratings — somebody with four visits counts once
    count: z.coerce.number("Please provide a valid count").int()
})

export type ShopTag = z.infer<typeof ShopTagSchema>

// the same tag carrying the shop it belongs to — what /apis/shop-tags returns,
// since one response covers many shops
export const ShopTagListingSchema = ShopTagSchema.extend({
    shopId: z.uuidv7("Please provide a valid shop id")
})

export type ShopTagListing = z.infer<typeof ShopTagListingSchema>

/**
 * Fetch the tags a shop currently qualifies for.
 *
 * Public endpoint — no session or CSRF header, same as getShopById. The
 * server already filtered and ordered the list, so render it as it arrives.
 * An empty array means the shop has no qualifying tags, which is a normal
 * answer and not an error.
 */
export async function getShopTags(shopId: string): Promise<ShopTag[]> {
    const response = await fetch(`${process.env.REST_API_URL}/shops/${shopId}/tags`)
    if(!response.ok) throw new Error(`Failed to fetch shop tags: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopTagSchema.array().parse(data)
}

/**
 * Fetch tags for many shops in one request.
 *
 * A page of search results costs one call here rather than one per card. Pass
 * the ids on screen to narrow it; omit them to get every shop that has a tag.
 * An empty array of ids means "no shops", so it short-circuits without a
 * request at all.
 */
export async function getShopTagListings(shopIds?: string[]): Promise<ShopTagListing[]> {
    if(shopIds?.length === 0) return []
    const url = new URL(`${process.env.REST_API_URL}/shop-tags`)
    shopIds?.forEach((shopId) => url.searchParams.append('shopId', shopId))
    const response = await fetch(url)
    if(!response.ok) throw new Error(`Failed to fetch shop tags: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopTagListingSchema.array().parse(data)
}

/**
 * Group listings by shop so a card can look up its own tags.
 *
 * A plain object rather than a Map, because this crosses the loader boundary
 * and gets serialized on the way to the browser.
 *
 * Shops with no qualifying tags contribute no rows, so they are simply absent
 * — callers should read a miss as "no tags", not as an error.
 */
export function groupTagsByShopId(listings: ShopTagListing[]): Record<string, ShopTag[]> {
    const grouped: Record<string, ShopTag[]> = {}
    for(const {shopId, ...tag} of listings) {
        (grouped[shopId] ??= []).push(tag)
    }
    return grouped
}

export type TagFilterOption = {
    interest: ShopTag['interest']
    // how many shops carry this tag, so a chip can say "Quiet Atmosphere (4)"
    shopCount: number
}

/**
 * Collapse listings into the distinct interests worth offering as filters.
 *
 * The options have to come from tags shops actually earned rather than from
 * the full interest list, or the UI would offer filters that can only ever
 * return nothing.
 *
 * Alphabetical by category, so the chips do not reshuffle between requests the
 * way the listings themselves do (those are ordered by score, per shop).
 */
export function collectFilterableTags(listings: ShopTagListing[]): TagFilterOption[] {
    const byInterestId = new Map<string, TagFilterOption>()
    for(const {interest} of listings) {
        const existing = byInterestId.get(interest.id)
        if(existing === undefined) {
            byInterestId.set(interest.id, {interest, shopCount: 1})
        } else {
            // one row per (shop, interest), so every repeat is another shop
            existing.shopCount += 1
        }
    }
    return [...byInterestId.values()]
        .sort((a, b) => a.interest.category.localeCompare(b.interest.category))
}
