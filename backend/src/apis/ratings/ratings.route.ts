import { Router } from 'express'
import {
    postRatingController,
    putRatingController,
    getRatingsController
} from './ratings.controller.ts'
import { isLoggedInController } from '../../utils/controllers/is-logged-in.controller.ts'

const basePath = '/apis/visits' as const
const router = Router()

/**
 * POST /apis/visits/:visitId/ratings  { interestId, value }
 * Rate an interest for a visit (requires authentication + CSRF)
 *
 * GET /apis/visits/:visitId/ratings
 * List a visit's ratings (requires authentication, no CSRF — safe read)
 */
router.route('/:visitId/ratings')
    .post(isLoggedInController, postRatingController)
    .get(isLoggedInController, getRatingsController)

/**
 * PUT /apis/visits/:visitId/ratings/:interestId  { value }
 * Update a rating's value (requires authentication + CSRF)
 */
router.route('/:visitId/ratings/:interestId')
    .put(isLoggedInController, putRatingController)

export const ratingsRoute = { basePath, router }
