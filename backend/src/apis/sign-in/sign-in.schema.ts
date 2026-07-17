import {PrivateProfileSchema} from "../profile/profile.model.ts";
import {z} from "zod/v4";




/**
 * The shape of the data that comes from the client when signing in.
 *
 * Derived from the profile schema: only the email is reused, extended with a
 * plaintext password field (which is never stored — it's verified against the
 * stored hash).
 *
 * @property email {string} the email for the profile
 * @property password {string} the plaintext password to verify
 */



export const SignInProfileSchema = PrivateProfileSchema
    .pick({ email: true })
    .extend({
        password: z.string('password is required')
            .min(8, 'profile password cannot be less that 8 characters')
            .max(32, 'profile password cannot be over 31 characters')
    })

export type SignInProfile = z.infer<typeof SignInProfileSchema>