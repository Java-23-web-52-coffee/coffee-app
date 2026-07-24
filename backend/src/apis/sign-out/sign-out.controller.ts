import {sendServerError} from "../../utils/response.utils.ts";
import type { Request, Response } from 'express'
/**
 * Express controller for sign-out.
 *
 * Destroys the session (removing it from the Redis store) and clears the session
 * cookie. Idempotent: returns `204 No Content` whether or not a session existed,
 * so it is not guarded — signing out should always succeed.
 *
 * @endpoint POST /apis/sign-out
 * @param request an object modeling the incoming request
 * @param response an object modeling the response that will be sent to the client
 * @returns 204 No Content on success, or a 500 ErrorResponse
 */



export function signOutController (request: Request, response: Response): void {
    request.session.destroy((error) => {
        if(error) {
            console.error(error)
            sendServerError(request, response)
            return
        }
        // 'connect.sid' is express-session's default cookie name (no custom name is set)
        response.clearCookie('connect.sid')
        response.status(204).send()

    })
}