import {PrivateProfileSchema} from "../profile/profile.model.ts";
import {z} from "zod/v4";


export const SignUpProfileSchema = PrivateProfileSchema
.omit({ passwordHash:true, activationToken: true, id: true})
.extend({
    passwordConfirm: z.string('password confirmation is required')
        .min(8, 'password confirm cannot be less than 8 characters' )
        .max(32, 'profile password '),
    password: z.string('password is required')
        .min(8, 'profile password cannot be less than 8 characters' )
        .max(32, 'profile password cannot be over 32 characters' )
})
.refine(data => data.password === data.passwordConfirm, {
    message: 'passwords do not match'
})