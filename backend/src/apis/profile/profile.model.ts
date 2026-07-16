import { z } from 'zod/v4'
import {sql} from "../../utils/database.utils.ts";


export const PrivateProfileSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id'),
    activationToken: z.string('Please provide a valid activationToken')
        .length (32, 'profile activation token must be 32 characters')
        .nullable(),
    email: z
        .email('please provide a valid email')
        .max(127, 'please provide a valid email (max 127 characters)'),
    name: z.string('Please provide a valid name')
        .trim()
        .min(1, 'please provide a valid name(min 1 characters)')
        .max(63, 'please provide a valid name (max 63 characters)'),
    passwordHash: z.string('Please provide a valid hash')
        .length (97, { message: 'profile hash must be 97 characters' })
})


export type PrivateProfile = z.infer<typeof PrivateProfileSchema>

export async function insertProfile (profile: PrivateProfile): Promise<string> {
    PrivateProfileSchema.parse(profile)
    const { activationToken, email, passwordHash, name, id } = profile
    await sql`INSERT INTO profile(id, activation_token, email, password_hash, name) VALUES (${id}, ${activationToken}, ${email}, ${passwordHash}, ${name})`
    return 'Profile Successfully Created'
}