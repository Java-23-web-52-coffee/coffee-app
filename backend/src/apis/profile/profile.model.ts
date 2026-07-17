import {z} from 'zod/v4'
import {sql} from "../../utils/database.utils.ts";


export const PrivateProfileSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id'),
    activationToken: z.string('Please provide a valid activationToken')
        .length(32, 'profile activation token must be 32 characters')
        .nullable(),
    email: z
        .email('please provide a valid email')
        .max(127, 'please provide a valid email (max 127 characters)'),
    name: z.string('Please provide a valid name')
        .trim()
        .min(1, 'please provide a valid name(min 1 characters)')
        .max(63, 'please provide a valid name (max 63 characters)'),
    passwordHash: z.string('Please provide a valid hash')
        .length(97, {message: 'profile hash must be 97 characters'})
})


export type PrivateProfile = z.infer<typeof PrivateProfileSchema>

export async function insertProfile(profile: PrivateProfile): Promise<string> {
    PrivateProfileSchema.parse(profile)
    const {activationToken, email, passwordHash, name, id} = profile
    await sql`INSERT INTO profile(id, activation_token, email, password_hash, name)
              VALUES (${id}, ${activationToken}, ${email}, ${passwordHash}, ${name})`
    return 'Profile Successfully Created'
}


/**
 * Selects a profile from the profile table by activationToken
 * @param activationToken the profile's activation token to search for in the profile table
 * @returns Profile or null if no profile was found
 */

export async function selectPrivateProfileByActivationToken(activationToken: string): Promise < PrivateProfile | null > {
    const rowList = await sql`SELECT id, activation_token, email, password_hash, name
                              FROM profile
                              WHERE activation_token = ${activationToken}`
    const result = PrivateProfileSchema.array().max(1).parse(rowList)
    return result[0] ?? null
}

/**
 * updates a profile in the profile table
 * @param profile
 * @returns {Promise<string>} 'Profile successfully updated'
 */
export async function updateProfile (profile: PrivateProfile): Promise<string> {
    const { id, activationToken, email, passwordHash, name } = profile
    await sql`UPDATE profile SET activation_token = ${activationToken}, email = ${email}, password_hash = ${passwordHash}, name = ${name} WHERE id = ${id}`
    return 'Profile Successfully Updated'
}
/**
 * Selects the privateProfile from the profile table by email
 * @param email  the profile's email to search for in the profile table
 * @returns Profile or null if no profile was found
 */
export async function selectPrivateProfileByProfileEmail (email: string) : Promise<PrivateProfile | null> {
    const rowList = await sql`SELECT id, activation_token, email, password_hash, name FROM profile WHERE email = ${email}`

    const result = PrivateProfileSchema.array().max(1).parse(rowList)

    return result[0] ?? null
}