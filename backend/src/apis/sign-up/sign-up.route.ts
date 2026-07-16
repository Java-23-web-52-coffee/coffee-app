import { signupProfileController } from './sign-up-controller.ts'
// import {activationController} from "./activation.controller.ts";

// declare a basePath for this router
import {Router} from "express";

const basePath = '/apis/sign-up' as const

// instantiate a new router project
const router = Router()

// define signup route for this router
router.route('/').post(signupProfileController)

// router.route('/activation/:activation').get(activationController)

// export the router with the basePath and router object
export const signUpRoute = { basePath, router }
