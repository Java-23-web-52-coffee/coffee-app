import { z } from 'zod/v4'
import type { Status } from "~/utils/interfaces/Status";
import { RatingRequestSchema, RatingSchema, type RatingRequest } from "~/utils/models/rating.model";

export const VisitSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id').nullable(),
    shopId: z.uuidv7('Please provide a valid shop id'),
    profileId: z.uuidv7('Please provide a valid profile id'),
    createdAt: z.coerce.date(),
})

export type Visit = z.infer<typeof VisitSchema>

// A visit and the ratings collected for it are logged in one transactional
// request — there is no endpoint that adds a rating to an existing visit, and
// a logged experience is never edited. profileId is server-owned (session).
// See documentation/experience-log-plan.md.
export const VisitRequestSchema = z.object({
    shopId: z.uuidv7('Please provide a valid shop id'),
    ratings: z.array(RatingRequestSchema).min(1, 'Please rate at least one interest'),
})

export type VisitRequest = z.infer<typeof VisitRequestSchema>

// the experience-log form posts only the ratings — shopId comes from the
// route path, so it inherits the "at least one rating" rule without the
// form having to restate it
export const LogVisitFormSchema = VisitRequestSchema.omit({ shopId: true })

export type LogVisitForm = z.infer<typeof LogVisitFormSchema>

// what the endpoint returns: the visit plus the rating rows that committed
// with it, so nothing needs a follow-up read to confirm what was saved
export const LoggedVisitSchema = VisitSchema.extend({
    ratings: RatingSchema.array(),
})

export type LoggedVisit = z.infer<typeof LoggedVisitSchema>

/**
 * Log a visit and its ratings in a single request. The backend writes the
 * visit row and every rating row in one transaction, so a rejected rating
 * leaves nothing behind — there is no partial-success state to report or
 * clean up, unlike the per-rating writes this replaced.
 */
export async function postVisit(
    shopId: string,
    ratings: RatingRequest[],
    authorization: string,
    cookie?: string | null,
): Promise<Status> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': authorization,
    }
    if (cookie) {
        headers['Cookie'] = cookie
    }

    try {
        const response = await fetch(`${process.env.REST_API_URL}/profiles/me/visits`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ shopId, ratings }),
        })

        if (response.status !== 201) {
            // the backend's ErrorResponse carries a human-readable `message`;
            // prefer it over a generic string so validation failures say what
            // actually went wrong
            const message = await readErrorMessage(response)
            return { status: response.status, data: null, message }
        }

        const data = await response.json()
        return {
            status: 201,
            data: LoggedVisitSchema.parse(data),
            message: 'Experience logged',
        }
    } catch (error) {
        console.error('failed to log visit', error)
        return {
            status: 503,
            data: null,
            message: 'Unable to reach the server. Please check your connection and try again.',
        }
    }
}

/**
 * Pull `message` off an ErrorResponse body, falling back to a generic string
 * when the response isn't the shape we expect (a proxy error page, say).
 */
async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json()
        const parsed = z.object({ message: z.string() }).safeParse(body)
        if (parsed.success) {
            return parsed.data.message
        }
    } catch {
        // fall through to the generic message
    }
    return 'Unable to log this experience. Please try again.'
}
