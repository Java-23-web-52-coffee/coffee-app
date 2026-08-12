import {Router} from "express";
import {getMyVisitsController, getVisitByIdController, postVisitController} from "./visit.controller.ts";
import {isLoggedInController} from "../../utils/controllers/is-logged-in.controller.ts";

/**
 * POST /apis/profiles/me/visits  { shopId, ratings: [{ interestId, value }] }
 * Log a visit and its ratings in one transaction (requires authentication + CSRF)
 *
 * GET /apis/profiles/me/visits
 * List the signed-in profile's visits
 */
const myVisitsBasePath = '/apis/profiles/me/visits' as const
const myVisitsRouter = Router()

myVisitsRouter.route('/')
    .post(isLoggedInController, postVisitController)
    .get(isLoggedInController, getMyVisitsController)

export const myVisitsRoute = { basePath: myVisitsBasePath, router: myVisitsRouter }

/**
 * GET /apis/visits/:id
 * Read one visit; visits are private, so the session profile must own it.
 */
const visitBasePath = '/apis/visits' as const
const visitRouter = Router()

visitRouter.route('/:id')
    .get(isLoggedInController, getVisitByIdController)

export const visitRoute = { basePath: visitBasePath, router: visitRouter }
