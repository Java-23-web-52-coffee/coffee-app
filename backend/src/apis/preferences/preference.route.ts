import { Router } from 'express'
import {
    postPreferenceController,
    putPreferenceController,
    getMyPreferencesController
} from './preference.controller.ts'
import { isLoggedInController } from '../../utils/controllers/is-logged-in.controller.ts'

const basePath = '/apis/profiles/me/preferences' as const
const router = Router()

/**
 * POST /apis/profiles/me/preferences  { interestId, importance }
 * Create a preference (requires authentication + CSRF)
 *
 * GET /apis/profiles/me/preferences
 * List the signed-in profile's preferences (requires a session, no CSRF — safe read)
 */
router.route('/')
    .post(isLoggedInController, postPreferenceController)
    .get(isLoggedInController, getMyPreferencesController)

/**
 * PUT /apis/profiles/me/preferences/:interestId  { importance }
 * Update a preference's importance (requires authentication + CSRF)
 */
router.route('/:interestId')
    .put(isLoggedInController, putPreferenceController)

export const preferenceRoute = { basePath, router }
