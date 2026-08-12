import type {Request, Response} from 'express';
import {insertVisitWithRatings, selectVisitById, selectVisitsByProfileId} from "./visit.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {PostVisitSchema, type Visit} from "./visit.schema.ts";
import {v7 as uuidv7} from "uuid";

// Postgres SQLSTATEs we translate into meaningful HTTP responses
const FOREIGN_KEY_VIOLATION = '23503' // shop or interest does not exist

/**
 * Express controller for listing the signed-in profile's visits.
 *
 * Visits are private logs, so this only ever returns the session profile's
 * own rows — there is no endpoint that lists everybody's.
 *
 * @endpoint GET /apis/profiles/me/visits
 * @returns 200 with an array of visits, or an ErrorResponse (401/500)
 */
export async function getMyVisitsController (request: Request, response: Response): Promise<void> {
    try {
        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to view your visits')
            return
        }

        const visits = await selectVisitsByProfileId(profile.id)

        response.json(visits)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for logging a visit together with its ratings.
 *
 * shopId and the ratings array come from the body; profileId comes from the
 * session and is never read off the request. The visit and its ratings are
 * written in one transaction, so a rejected rating leaves no visit behind.
 *
 * @endpoint POST /apis/profiles/me/visits
 * @returns 201 with the visit and its ratings, or an ErrorResponse (400/401/404/500)
 */
export async function postVisitController(request: Request, response: Response): Promise<void> {
    try {
        // the DB has no CHECK on rating.value, so this is the only thing
        // standing between a bad score and a stored row — see
        // documentation/experience-log-plan.md
        const validationResult = PostVisitSchema.safeParse(request.body)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to log a visit')
            return
        }

        const {shopId, ratings} = validationResult.data

        // assemble the full visit with server-owned fields
        const visit: Visit = {
            id: uuidv7(),
            shopId,
            profileId: profile.id,
            createdAt: new Date()
        }

        const loggedVisit = await insertVisitWithRatings(visit, ratings)

        response
            .status(201)
            .location(`/apis/visits/${visit.id}`)
            .json(loggedVisit)
    } catch (error: any) {
        // a shopId or interestId that does not exist is the caller's mistake,
        // not a server fault; the transaction has already rolled back
        if (error?.code === FOREIGN_KEY_VIOLATION) {
            sendError(request, response, 404, 'No shop or interest exists with that id')
            return
        }
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for reading one visit.
 *
 * Visits are private logs — the signed-in profile must own the visit.
 *
 * @endpoint GET /apis/visits/:id
 * @returns 200 with the visit, or an ErrorResponse (400/401/403/404/500)
 */
export async function getVisitByIdController(request: Request, response: Response): Promise<void> {
    try {
        const { id } = request.params

        if (typeof id !== "string") {
            sendError(request, response, 400, "Please provide a valid visit id")
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to view a visit')
            return
        }

        const visit = await selectVisitById(id)

        if (visit === null) {
            sendError(request, response, 404, "Visit not found")
            return
        }

        if (visit.profileId !== profile.id) {
            sendError(request, response, 403, 'You may only view your own visits')
            return
        }

        response.status(200).json(visit)

    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
