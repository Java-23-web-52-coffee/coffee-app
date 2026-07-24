// define the base path for the route
import {Router} from "express";
import {getAllVisitsController, postVisitController} from "./visit.controller.ts";

const basePath = '/apis/visit' as const

// instantiate a new router object
const router = Router()

// define shop route for this router
router.route('/').get(getAllVisitsController)
router.route('/').post(postVisitController)

export const visitRoute = { basePath, router }