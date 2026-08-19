import type { Request, Response } from 'express'
import {
    type Rating,
    RatingModel,
    insertRating,
    updateRating,
    selectRatingsByVisitId
} from './ratings.model.ts'
import { selectVisitById } from '../visit/visit.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

// Postgres SQLSTATEs we translate into meaningful HTTP responses
const UNIQUE_VIOLATION = '23505' // rating already exists for this visit+interest
const FOREIGN_KEY_VIOLATION = '23503' // interest does not exist

/**
 * Express controller for creating a rating.
 *
 * visitId comes from the path; interestId + value come from the request body.
 * The signed-in profile must be the owner of the visit being rated.
 *
 * @endpoint POST /apis/visits/:visitId/ratings
 * @returns 201 with the created rating, or an ErrorResponse (400/401/403/404/409/500)
 */
export async function postRatingController (request: Request, response: Response): Promise<void> {
    try {
        const paramResult = RatingModel.pick({ visitId: true }).safeParse({
            visitId: request.params.visitId
        })
        if (!paramResult.success) {
            sendZodError(request, response, paramResult.error)
            return
        }

        const bodyResult = RatingModel.omit({ visitId: true }).safeParse(request.body)
        if (!bodyResult.success) {
            sendZodError(request, response, bodyResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to set a rating')
            return
        }

        const visit = await selectVisitById(paramResult.data.visitId)
        if (visit === null) {
            sendError(request, response, 404, 'No visit exists with that id')
            return
        }
        if (visit.profileId !== profile.id) {
            sendError(request, response, 403, 'You may only rate your own visits')
            return
        }

        const rating: Rating = {
            visitId: paramResult.data.visitId,
            interestId: bodyResult.data.interestId,
            value: bodyResult.data.value
        }

        const createdRating = await insertRating(rating)

        response
            .status(201)
            .location(`/apis/visits/${createdRating.visitId}/ratings/${createdRating.interestId}`)
            .json(createdRating)
    } catch (error: any) {
        // resubmitting an already-set rating is an expected conflict; a
        // missing interest is a 404
        if (error?.code === UNIQUE_VIOLATION) {
            sendError(request, response, 409, 'You already rated this interest for this visit')
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
 * Express controller for listing a visit's ratings.
 *
 * The signed-in profile must be the owner of the visit.
 *
 * @endpoint GET /apis/visits/:visitId/ratings
 * @returns 200 with an array of ratings, or an ErrorResponse (401/403/404/500)
 */
export async function getRatingsController (request: Request, response: Response): Promise<void> {
    try {
        const paramResult = RatingModel.pick({ visitId: true }).safeParse({
            visitId: request.params.visitId
        })
        if (!paramResult.success) {
            sendZodError(request, response, paramResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to view ratings')
            return
        }

        const visit = await selectVisitById(paramResult.data.visitId)
        if (visit === null) {
            sendError(request, response, 404, 'No visit exists with that id')
            return
        }
        if (visit.profileId !== profile.id) {
            sendError(request, response, 403, 'You may only view ratings for your own visits')
            return
        }

        const ratings = await selectRatingsByVisitId(paramResult.data.visitId)

        response.status(200).json(ratings)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for updating a rating's value.
 *
 * The signed-in profile must be the owner of the visit.
 *
 * @endpoint PUT /apis/visits/:visitId/ratings/:interestId
 * @returns 200 with the updated rating, 404 if none existed, or an ErrorResponse (400/401/403/500)
 */
export async function putRatingController (request: Request, response: Response): Promise<void> {
    try {
        const bodyResult = RatingModel.pick({ value: true }).safeParse(request.body)
        if (!bodyResult.success) {
            sendZodError(request, response, bodyResult.error)
            return
        }

        const paramResult = RatingModel.pick({ visitId: true, interestId: true }).safeParse({
            visitId: request.params.visitId,
            interestId: request.params.interestId
        })
        if (!paramResult.success) {
            sendZodError(request, response, paramResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to update a rating')
            return
        }

        const visit = await selectVisitById(paramResult.data.visitId)
        if (visit === null) {
            sendError(request, response, 404, 'No visit exists with that id')
            return
        }
        if (visit.profileId !== profile.id) {
            sendError(request, response, 403, 'You may only update ratings for your own visits')
            return
        }

        const rating: Rating = {
            visitId: paramResult.data.visitId,
            interestId: paramResult.data.interestId,
            value: bodyResult.data.value
        }

        const updatedRating = await updateRating(rating)
        if (updatedRating === null) {
            sendError(request, response, 404, 'No rating exists for that interest on this visit')
            return
        }

        response.status(200).json(updatedRating)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
