import { z } from 'zod/v4'
import type { Status } from "~/utils/interfaces/Status";

// NOTE: the schemas below are live — `visit.model.ts` composes them into the
// transactional POST /apis/profiles/me/visits body. The fetch helpers
// (`getRatings`, `postRating`, `postRatings`) are not: ratings now travel with
// the visit that owns them, and a logged experience cannot be edited, so
// there is nothing to prefill and no 409 to retry as a PUT. They are kept
// against the per-rating endpoints still mounted on the backend; whether all
// of it goes is an open question in documentation/experience-log-plan.md.

// schema for validating a single rating — how well one interest applied to
// a visit. visitId is never part of the request; it's server-owned from
// the path (POST/GET/PUT /apis/visits/:visitId/ratings...).

export const RatingRequestSchema = z.object({
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    value: z.number('Please provide a valid rating value').min(1).max(5),
})

export type RatingRequest = z.infer<typeof RatingRequestSchema>

// the full saved rating record as returned by GET /visits/:visitId/ratings
export const RatingSchema = z.object({
    visitId: z.uuidv7('Please provide a valid uuid for visitId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    value: z.coerce.number('Please provide a valid rating value').min(1).max(5),
})

export type Rating = z.infer<typeof RatingSchema>

// the ratings form submits every rated interest in one go
export const RatingsFormSchema = z.object({
    ratings: z.array(RatingRequestSchema),
})

export type RatingsForm = z.infer<typeof RatingsFormSchema>

function ratingHeaders(authorization: string, cookie?: string | null): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': authorization,
    }
    if (cookie) {
        headers['Cookie'] = cookie
    }
    return headers
}

/**
 * Fetch every rating saved for a visit, so the form can be pre-populated
 * with prior 1-5 selections on load.
 */
export async function getRatings(visitId: string, authorization: string, cookie?: string | null): Promise<Rating[]> {
    const url = new URL(`${process.env.REST_API_URL}/visits/${visitId}/ratings`)
    const headers = ratingHeaders(authorization, cookie)

    const response = await fetch(url, { headers, method: 'GET', credentials: 'include' })
    if (!response.ok) {
        const error = new Error(`Failed to fetch ratings: ${response.status} ${response.statusText}`)
        ;(error as { status?: number }).status = response.status
        throw error
    }
    const data = await response.json()
    return RatingSchema.array().parse(data)
}

/**
 * Create a single rating. The backend's POST is create-only (409 if one
 * already exists for this visit+interest), so a 409 here is retried once
 * as a PUT to the same interest — lets the form be re-submitted later
 * without first loading and diffing existing ratings.
 */
export async function postRating(visitId: string, entry: RatingRequest, authorization: string, cookie?: string | null): Promise<number> {
    const headers = ratingHeaders(authorization, cookie)

    const response = await fetch(`${process.env.REST_API_URL}/visits/${visitId}/ratings`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(entry),
    })

    if (response.status !== 409) {
        return response.status
    }

    const retryResponse = await fetch(`${process.env.REST_API_URL}/visits/${visitId}/ratings/${entry.interestId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ value: entry.value }),
    })

    return retryResponse.status
}

/**
 * Save every rated interest from one form submission. Each entry is its
 * own request (the backend only accepts one interest at a time), fired in
 * parallel and collapsed into a single Status for the action to return.
 */
export async function postRatings(visitId: string, entries: RatingRequest[], authorization: string, cookie?: string | null): Promise<Status> {
    try {
        const statuses = await Promise.all(
            entries.map((entry) => postRating(visitId, entry, authorization, cookie)),
        )

        const failedStatus = statuses.find((status) => status !== 200 && status !== 201)
        if (failedStatus !== undefined) {
            return {
                status: failedStatus,
                data: null,
                message: 'Some ratings failed to save. Please try again.',
            }
        }

        return {
            status: 200,
            data: null,
            message: 'Ratings saved',
        }
    } catch (error) {
        console.error('failed to save ratings', error)
        return {
            status: 503,
            data: null,
            message: 'Unable to reach the server. Please check your connection and try again.',
        }
    }
}
