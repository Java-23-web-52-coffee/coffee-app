// define the base path for the route
import {Router} from "express";
import {getAllVisitsController, getVisitByIdController, postVisitController} from "./visit.controller.ts";
import {isLoggedInController} from "../../utils/controllers/is-logged-in.controller.ts";

const basePath = '/apis/visit' as const

// instantiate a new router object
const router = Router()

// define shop route for this router
router.route('/').get(getAllVisitsController)
router.route('/').post(isLoggedInController, postVisitController)
router.route("/:id").get(getVisitByIdController)

export const visitRoute = { basePath, router }