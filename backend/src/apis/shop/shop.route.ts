

// define the base path for the route
import {Router} from "express";
import {getAllShopsController, getShopByIdController, postShopController} from "./shop.controller.ts";

const basePath = '/apis/shops' as const

// instantiate a new router object
const router = Router()

// define shop route for this router
router.route('/').get(getAllShopsController)

// add a coffee shop
router.route('/').post(postShopController)

router.route('/:id').get(getShopByIdController)

// export the router with the basePath and router object
export const shopRoute = { basePath, router }