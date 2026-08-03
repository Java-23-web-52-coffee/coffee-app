import type {Status} from "~/utils/interfaces/Status";
import {z} from "zod/v4";
import {ProfileSchema} from "~/utils/models/profile.model";



export type Profile = z.infer<typeof ProfileSchema>

export const SignInSchema = ProfileSchema.pick({email:true})
    .extend({
        password: z.string().min(8 )
            .max(32, 'please provide a valid password'),
    })

export type SignIn = z.infer<typeof SignInSchema>



export async function postSignIn(data: SignIn): Promise<{result: Status, headers: Headers}> {

    try {
        const response = await fetch
        (`${process.env.REST_API_URL}/sign-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        })
        const body = await response.json().catch(() => null)

        if (response.status === 200) {
            return {
                result: {
                status: 200,
                data: body,
                message: null}, headers: response.headers}
        }

        return {
            result: {
                status: response.status,
                data: null,
                message: body?.message ?? 'Failed to sign in',
            },
            headers: response.headers
        }
    } catch (error) {
        console.error('sign-up request failed to reach the server', error)
        return {
            result: {
                status: 503,
                data: null,
                message: 'Unable to reach the server. Please check your connection and try again.'
            },
            headers: new Headers()
        }
    }
}