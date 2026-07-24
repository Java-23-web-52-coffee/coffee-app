import pkg from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import type { PublicProfile } from '../../apis/profile/profile.model'
import { sendError } from '../response.utils.ts'

const { verify } = pkg

/**
 * Middleware guarding state-changing routes.
 *
 * Identity comes from the session (established at sign-in and carried by the
 * session cookie). On top of that, the request must echo the CSRF token in the
 * `Authorization` header, matching the token stored in the session — a value a
 * cross-site page cannot read or set, which is what defends these routes against
 * CSRF.
 *
 *   - no session          -> 401 Unauthorized (you are not signed in)
 *   - bad/missing token    -> 403 Forbidden    (signed in, but the request is refused)
 *
 * @param request the Express request
 * @param response the Express response
 * @param next called only when the request is authenticated and the CSRF token is valid
 */
export function isLoggedInController (request: Request, response: Response, next: NextFunction): void {
    try {
        // identity + the CSRF token issued at sign-in, both held in the session
        const profile: PublicProfile | undefined = request.session?.profile
        const signature: string | undefined = request.session?.signature

        // the CSRF token the client echoes back on the request
        const unverifiedJwtToken: string | undefined = request.headers?.authorization

        // not signed in at all
        if (profile === undefined || signature === undefined) {
            sendError(request, response, 401, 'Please login to continue')
            return
        }

        // signed in, but the CSRF token is missing or does not match the session
        if (unverifiedJwtToken === undefined || unverifiedJwtToken !== request.session?.jwt) {
            sendError(request, response, 403, 'Invalid or missing CSRF token')
            return
        }

        // verify the token's signature/integrity; throws if tampered or expired
        verify(unverifiedJwtToken, signature)

        // authenticated and the CSRF token is valid — proceed
        next()
    } catch (error: unknown) {
        console.error(error)
        sendError(request, response, 403, 'Invalid or missing CSRF token')
    }
}