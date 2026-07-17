import {signOutController} from "./sign-out.controller.ts";
import {Router} from "express";


// declare a basePath for this router


const basePath = '/apis/sign-out' as const

// instantiate a new router object
const router = Router()

/**
 * POST /apis/sign-out
 * Destroy the current session (idempotent; not guarded)
 */

router.route('/').post(signOutController)

// export the router with the basePath and router object
export const signOutRoute = { basePath, router }