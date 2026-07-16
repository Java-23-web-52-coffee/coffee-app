import {SignUpProfileSchema} from "./sign-up.schema.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import type {Request, Response} from 'express';
import {setActivationToken, setHash} from "../../utils/auth.utils.ts";
import {v7 as uuidv7} from 'uuid';
import {insertProfile, type PrivateProfile} from "../profile/profile.model.ts";
import Mailgun from "mailgun.js";
import formData from 'form-data'



const UNIQUE_VIOLATION = '23505'

export async function signupProfileController(request: Request, response: Response): Promise<void> {
    try {
        const validationResult = SignUpProfileSchema.safeParse(request.body)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }
        const {name, email, password} = validationResult.data
        const passwordHash = await setHash(password)
        const activationToken = setActivationToken()
        const id = uuidv7()
        const profile: PrivateProfile = {
            id,
            name,
            activationToken,
            email,
            passwordHash
        }
        await insertProfile(profile)
        const activationLink: string = `${request.protocol}://${request.hostname}:8080${request.originalUrl}/activation/${activationToken}`
        await sendActivationEmail(email, activationLink)
            .catch(mailError => {
                console.error('Activation email failed to send:', mailError)
            })
        response
            .status(201)
            .location(`/apis/profile/${id}`)
            .json({id, name})
    } catch (error: any) {
        if (error?.code === UNIQUE_VIOLATION) {
            sendError(request, response, 409, 'An account with that email or name already exists')
            return
        }
    console.error(error)
        sendServerError(request, response)

    }
}

async function sendActivationEmail (to: string, activationLink: string): Promise<void> {
    const mailgun: Mailgun = new Mailgun(formData)
    const mailgunClient = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY as string })
    const message = `<h2>Welcome to coffee app.</h2>
    <p>In order to start getting personalized coffee shop recommendations you must confirm your account.</p>
    <p><a href="${activationLink}">${activationLink}</a></p>`

    await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN as string, {
        from: `Mailgun Sandbox <postmaster@${process.env.MAILGUN_DOMAIN as string}>`,
        to,
        subject: 'Account activated-start matching with your perfect coffee shop!',
        html: message
    })
}