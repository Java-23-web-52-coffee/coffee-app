import type { Request, Response } from 'express'
import { z } from 'zod/v4'
import { type ShopMatch, selectMatchesForProfile } from './matches.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

// Express hands query params back as strings, so coerce before bounding.
// Out-of-range is a 400 rather than a silent clamp — a caller asking for 99
// results has a bug worth telling them about.
const LimitQueryModel = z.coerce.number('Please provide a valid limit')
    .int('Please provide a whole number for limit')
    .min(1, 'limit must be at least 1')
    .max(25, 'limit may be at most 25')
    .default(5)

/**
 * Express controller for listing the shops that best match the signed-in
 * profile's preferences.
 *
 * The ranking is personalised to the session profile, so this is never public.
 * An empty array is a valid answer, not an error: it is what a profile with no
 * preferences gets, and what a profile whose interests nobody has rated yet
 * gets. The frontend prompts for preferences off the empty array rather than
 * the API refusing the request.
 *
 * @endpoint GET /apis/profiles/me/matches?limit=5
 * @returns 200 with the match array, closest first, or an ErrorResponse (400/401/500)
 */
export async function getMyMatchesController (request: Request, response: Response): Promise<void> {
    try {
        const limitResult = LimitQueryModel.safeParse(request.query.limit)
        if (!limitResult.success) {
            sendZodError(request, response, limitResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to see your matches')
            return
        }

        const matches: ShopMatch[] = await selectMatchesForProfile(profile.id, limitResult.data)

        response.json(matches)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
