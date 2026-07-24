import type { Request, Response } from 'express'
import {sql} from "../../utils/database.utils.ts";
import {z} from "zod/v4";
import {selectPrivateProfileByActivationToken, updateProfile} from "../profile/profile.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";


/**
 * Express controller for account activation.
 *
 * Consumes the activation token from the link emailed at sign-up: it clears the
 * token (marking the account active) and returns the now-active public profile.
 * A token that matches no pending profile — including one already activated — is
 * reported as `404 Not Found`.
 *
 * @endpoint GET /apis/sign-up/activation/:activation
 * @param request an object containing the activation token in params
 * @param response an object modeling the response that will be sent to the client
 * @returns 200 with the activated public profile, or an ErrorResponse (400/404/500)
 */
export async function activationController(request: Request, response: Response) {
    try {
        const validationResult = z
            .object({
                activation: z
                    .string(`activation us required`)
                    .length(32, 'please provide a valid activation token')
            }).safeParse(request.params)

        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const {activation} = validationResult.data

        // look up the profile awaiting activation by its token
        const profile = await selectPrivateProfileByActivationToken(activation)
        if (profile === null) {
            sendError(request, response, 404, `Account activation has failed. Have you already activated this account?`)
            return
        }

        // clear the token to mark the account active
        profile.activationToken = null
        await updateProfile(profile)

        // return the activated public profile only — never the hash/email/activationToken
        const {id, name} = profile
        response.status(200).json({id, name})
    } catch (error: unknown) {
        console.error(error)
        sendServerError(request, response)
    }
}