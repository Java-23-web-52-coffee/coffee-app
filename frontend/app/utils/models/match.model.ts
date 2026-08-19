import { z } from 'zod/v4'
import { ShopSchema } from '~/utils/models/shop.model'

// A match is computed, never stored: a shop plus how well it fits the
// signed-in profile's preferences. It changes as either the profile's
// preferences or anybody's ratings change.
//
// See documentation/matching-api-plan.md for what the numbers mean and, more
// importantly, why matchScore is not the thing we render.

export const MATCH_QUALITIES = ['great', 'good', 'fair', 'weak', 'limited'] as const

export type MatchQuality = typeof MATCH_QUALITIES[number]

export const ShopMatchSchema = ShopSchema.extend({
    // 0-100, higher is closer. Deliberately NOT displayed — scores cluster in
    // the 50-75 band by construction, so a bare 68 reads like a poor grade
    // when it is a strong match. Render matchQuality instead.
    matchScore: z.coerce.number('Please provide a valid match score').int().min(0).max(100),
    matchQuality: z.enum(MATCH_QUALITIES),
    // how much evidence sits behind the score, so the UI can say "based on 2
    // of your 6 preferences" rather than implying the number is authoritative
    ratedInterestCount: z.coerce.number('Please provide a valid rated interest count').int().min(0),
    preferenceCount: z.coerce.number('Please provide a valid preference count').int().min(1)
})

export type ShopMatch = z.infer<typeof ShopMatchSchema>

/**
 * Fetch the shops that best match the signed-in profile's preferences.
 *
 * An empty array is a normal answer, not an error — it is what a profile with
 * no preferences gets, and what any profile gets while no café has been rated
 * on an interest they care about. Callers render an empty state from it.
 *
 * @param authorization the session's CSRF token
 * @param cookie the request's cookie header, forwarded so the session travels
 * @param limit how many matches to ask for (backend bounds this 1-25)
 */
export async function getMyMatches(
    authorization: string,
    cookie?: string | null,
    limit = 3,
): Promise<ShopMatch[]> {
    const url = new URL(`${process.env.REST_API_URL}/profiles/me/matches`)
    url.searchParams.set('limit', String(limit))

    const headers: HeadersInit = {
        'Authorization': authorization,
        'Content-Type': 'application/json',
    }
    if (cookie) {
        headers['Cookie'] = cookie
    }

    const response = await fetch(url, { headers, method: 'GET', credentials: 'include' })
    if (!response.ok) {
        const error = new Error(`Failed to fetch matches: ${response.status} ${response.statusText}`)
        ;(error as { status?: number }).status = response.status
        throw error
    }
    const data = await response.json()
    return ShopMatchSchema.array().parse(data)
}
