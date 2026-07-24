


// declare a basePath for this router
import {Router} from "express";
import {signInController} from "./sign-in.controller.ts";

const basePath = '/apis/sign-in' as const

// instantiate a new router object
const router = Router()

// define signup route for this router
router.route('/').post(signInController)

// export the router with the basePath and router object
export const signInRoute = { basePath, router }