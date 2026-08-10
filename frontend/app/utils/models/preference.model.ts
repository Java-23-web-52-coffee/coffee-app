import { z } from 'zod/v4'
import type { Status } from "~/utils/interfaces/Status";

// schema for validating a single preference — how much one interest matters
// to the signed-in profile. profileId is never part of the request; the
// backend takes it from the session.

export const PreferenceRequestSchema = z.object({
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    importance: z.number('Please provide a valid importance').min(0).max(1),
})

export type PreferenceRequest = z.infer<typeof PreferenceRequestSchema>

// the full saved preference record as returned by GET /profiles/me/preferences
export const PreferenceSchema = z.object({
    profileId: z.uuidv7('Please provide a valid uuid for profileId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    importance: z.coerce.number('Please provide a valid importance').min(0).max(1),
})

export type Preference = z.infer<typeof PreferenceSchema>

// the preferences form submits every rated interest in one go
export const PreferencesFormSchema = z.object({
    preferences: z.array(PreferenceRequestSchema),
})

export type PreferencesForm = z.infer<typeof PreferencesFormSchema>

function preferenceHeaders(authorization: string, cookie?: string | null): HeadersInit {
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
 * Fetch every preference the signed-in profile has saved, so the form can
 * be pre-populated with their prior No/Nice/Must selections on load.
 */
export async function getMyPreferences(authorization: string, cookie?: string | null): Promise<Preference[]> {
    const url = new URL(`${process.env.REST_API_URL}/profiles/me/preferences`)
    const headers: HeadersInit = {
        'Authorization': authorization,
        'Content-Type': 'application/json',
    }
    if (cookie) {
        headers['Cookie'] = cookie
    }

    const response = await fetch(url, { headers, method: 'GET', credentials: 'include' })
    if (!response.ok) {
        const error = new Error(`Failed to fetch preferences: ${response.status} ${response.statusText}`)
        ;(error as { status?: number }).status = response.status
        throw error
    }
    const data = await response.json()
    return PreferenceSchema.array().parse(data)
}

/**
 * Create a single preference. The backend's POST is create-only (409 if one
 * already exists for this profile+interest), so a 409 here is retried once
 * as a PUT to the same interest — lets the form be re-submitted later
 * without first loading and diffing existing preferences.
 */
export async function postPreference(entry: PreferenceRequest, authorization: string, cookie?: string | null): Promise<number> {
    const headers = preferenceHeaders(authorization, cookie)

    const response = await fetch(`${process.env.REST_API_URL}/profiles/me/preferences`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(entry),
    })

    if (response.status !== 409) {
        return response.status
    }

    const retryResponse = await fetch(`${process.env.REST_API_URL}/profiles/me/preferences/${entry.interestId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ importance: entry.importance }),
    })

    return retryResponse.status
}

/**
 * Save every rated preference from one form submission. Each entry is its
 * own request (the backend only accepts one interest at a time), fired in
 * parallel and collapsed into a single Status for the action to return.
 */
export async function postPreferences(entries: PreferenceRequest[], authorization: string, cookie?: string | null): Promise<Status> {
    try {
        const statuses = await Promise.all(
            entries.map((entry) => postPreference(entry, authorization, cookie)),
        )

        const failedStatus = statuses.find((status) => status !== 200 && status !== 201)
        if (failedStatus !== undefined) {
            return {
                status: failedStatus,
                data: null,
                message: 'Some preferences failed to save. Please try again.',
            }
        }

        return {
            status: 200,
            data: null,
            message: 'Preferences saved',
        }
    } catch (error) {
        console.error('failed to save preferences', error)
        return {
            status: 503,
            data: null,
            message: 'Unable to reach the server. Please check your connection and try again.',
        }
    }
}
