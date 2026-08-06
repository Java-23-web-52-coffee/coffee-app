import type { Request, Response } from 'express'
import {
    type Preference,
    PreferenceModel,
    insertPreference,
    updatePreference,
    selectPreferencesByProfileId
} from './preference.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

// Postgres SQLSTATEs we translate into meaningful HTTP responses
const UNIQUE_VIOLATION = '23505' // preference already exists for this profile+interest
const FOREIGN_KEY_VIOLATION = '23503' // interest does not exist

/**
 * Express controller for creating a preference.
 *
 * The actor (profileId) is taken from the session; interestId + importance
 * come from the request body.
 *
 * @endpoint POST /apis/profiles/me/preferences
 * @returns 201 with the created preference, or an ErrorResponse (400/401/404/409/500)
 */
export async function postPreferenceController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = PreferenceModel.omit({ profileId: true }).safeParse(request.body)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to set a preference')
            return
        }

        const preference: Preference = {
            profileId: profile.id,
            interestId: validationResult.data.interestId,
            importance: validationResult.data.importance
        }

        const createdPreference = await insertPreference(preference)

        response
            .status(201)
            .location(`/apis/profiles/me/preferences/${createdPreference.interestId}`)
            .json(createdPreference)
    } catch (error: any) {
        // resubmitting an already-set preference is an expected conflict; a
        // missing interest is a 404
        if (error?.code === UNIQUE_VIOLATION) {
            sendError(request, response, 409, 'You already have a preference set for this interest')
            return
        }
        if (error?.code === FOREIGN_KEY_VIOLATION) {
            sendError(request, response, 404, 'No interest exists with that id')
            return
        }
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for updating a preference's importance.
 *
 * @endpoint PUT /apis/profiles/me/preferences/:interestId
 * @returns 200 with the updated preference, 404 if none existed, or an ErrorResponse (400/401/500)
 */
export async function putPreferenceController (request: Request, response: Response): Promise<void> {
    try {
        const bodyResult = PreferenceModel.pick({ importance: true }).safeParse(request.body)
        if (!bodyResult.success) {
            sendZodError(request, response, bodyResult.error)
            return
        }

        const paramResult = PreferenceModel.pick({ interestId: true }).safeParse({
            interestId: request.params.interestId
        })
        if (!paramResult.success) {
            sendZodError(request, response, paramResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to update a preference')
            return
        }

        const preference: Preference = {
            profileId: profile.id,
            interestId: paramResult.data.interestId,
            importance: bodyResult.data.importance
        }

        const updatedPreference = await updatePreference(preference)
        if (updatedPreference === null) {
            sendError(request, response, 404, 'No preference exists for that interest')
            return
        }

        response.status(200).json(updatedPreference)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for listing the signed-in profile's preferences.
 *
 * A safe read: it checks the session directly rather than going through
 * isLoggedInController, so no CSRF token is required.
 *
 * @endpoint GET /apis/profiles/me/preferences
 * @returns 200 with an array of preferences, or an ErrorResponse (401/500)
 */
export async function getMyPreferencesController (request: Request, response: Response): Promise<void> {
    try {
        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to view your preferences')
            return
        }

        const preferences = await selectPreferencesByProfileId(profile.id)

        response.status(200).json(preferences)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
