

// define the base path for the route
import {Router} from "express";
import {getAllShopsController} from "./shop.controller.ts";

const basePath = '/apis/shops' as const

// instantiate a new router object
const router = Router()

// define shop route for this router
router.route('/').get(getAllShopsController)

// export the router with the basePath and router object
export const shopRoute = { basePath, router }