
// define the base path for the route

import {Router} from "express";
import {getAllInterestsController, postInterestController} from "./interest.controller.ts";

const basePath = '/apis/interest' as const


// instantiate a new router object
const router = Router()


// define interest route for this router
router.route('/').get(getAllInterestsController)

// add an interest
router.route('/').post(postInterestController)


// export the router with the basePath and router object
export const interestRoute = { basePath, router }

