import {z} from "zod/v4";
import type {Status} from "~/utils/interfaces/Status";


export const ProfileSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id'),
    email: z.email('please input email address')
        .max(128, 'please provide a valid email (max 128 characters)'),
    name: z.string().min(1, 'please provide a valid name (min 1 characters')
        .min(2, 'please provide a valid name (min 2 characters)')
        .max(63, 'please provide a valid name (max 63 characters'),
})

export type Profile = z.infer<typeof ProfileSchema>

export const SignUpSchema = ProfileSchema.pick({email:true, name:true})
    .extend({
    password: z.string().min(8, 'profile password cannot be less than 8 characters' )
        .max(32, 'please provide a valid password (max 32 characters)'),
    passwordConfirm: z.string().min(8, 'profile password cannot be less than 8 characters')
        .max(32, 'please provide a valid password (max 32 characters)')
    })
    .refine((data) => data.password === data.passwordConfirm, {
    message: 'passwords do not match',
    path: ['passwordConfirm'],
    })

export type SignUp = z.infer<typeof SignUpSchema>


export async function postSignUp(data: SignUp) : Promise<Status> {


    // wrap the whole request so a network-level failure (backend down, DNS/refused
    // connection, timeout) never throws out of the action. A thrown error would
    // bubble to the route ErrorBoundary and replace the form with the error page;
    // returning a Status keeps the failure inline in the form instead.
   try {
       const response = await fetch(`${process.env.REST_API_URL}/sign-up`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json',
           },
           credentials: 'include',
           body: JSON.stringify(data),
       })
       const body = await response.json().catch(() => null)
       // parse the body defensively — a 500 could conceivably return no JSON
       if(response.status === 201) {
           return {
               status: 200,
               data: body,
               message: 'Account created! Check your email to activate your account'
           }
       }
       // otherwise the backend returned an ErrorResponse — surface its message
        return {
           status: response.status,
            data: null,
            message: body?.message ?? 'Failed to sign up. Please try again.'
        }
   } catch (error) {
       // fetch itself rejected — the server was never reached
       console.error('sign-up request failed to reach the server', error)
       return {
           status: 503,
           data: null,
           message: 'Unable to reach the server. Please check your connection and try again'
       }
   }
}
