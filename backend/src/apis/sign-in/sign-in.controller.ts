import {SignInProfileSchema} from "./sign-in.schema.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {type PrivateProfile, selectPrivateProfileByProfileEmail} from "../profile/profile.model.ts";
import {v7 as uuidv7} from 'uuid';
import {generateJwt, validatePassword} from "../../utils/auth.utils.ts";
import type { Request, Response } from 'express'


/**
 * Express controller for sign-in.
 *
 * On success the session is established (identity lives in the session cookie),
 * the CSRF token is returned in the `Authorization` header, and the signed-in
 * user's public profile is returned directly with `200 OK`. Bad credentials are
 * reported as `401 Unauthorized` with the shared ErrorResponse shape.
 *
 * @endpoint POST /apis/sign-in
 * @param request an object containing the body with an email and password
 * @param response an object modeling the response that will be sent to the client
 * @returns 200 with the public profile, or an ErrorResponse (400/401/500)
 */



export async function signInController (request: Request, response: Response) : Promise<void> {
    try{
        // validate the credentials coming from the request body
        const validationResult = SignInProfileSchema.safeParse(request.body)

        if(!validationResult.success){
            sendZodError(request, response, validationResult.error)
            return
        }

        const { email, password } = validationResult.data
        // look up the profile and verify the password; on any failure return the
        // SAME 401 so we don't reveal whether the email exists
        const profile: PrivateProfile | null = await selectPrivateProfileByProfileEmail(email)
        if(profile === null){
            sendError(request, response, 401, 'Email or password is incorrect please try again')
            return
        }

        const isPasswordValid = await validatePassword(profile.passwordHash, password)
        if(!isPasswordValid) {
            sendError(request, response, 401, 'Email or password is incorrect please try again')
            return
        }

        // establish the session; only public fields go into the JWT payload
        const { id, name} = profile
        const signature: string = uuidv7()
        const authorization: string = generateJwt({ id, email, name}, signature)

        // store only the public profile in the session — never the hash/email/activationToken
        request.session.profile = { id, name }
        request.session.jwt = authorization
        request.session.signature = signature

        // return the CSRF token in the Authorization header (guarded routes must echo it back)
        response.header({authorization})
        // respond with the public profile only — never the hash/email/activationToken
        response.status(200).json({id, name})
    }catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}