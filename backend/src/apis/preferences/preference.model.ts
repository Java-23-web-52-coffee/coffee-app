import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'

//
// schema for validating preference objects along with weighting an interest
// preference table contains profileId, interestId, and importance

export const PreferenceModel = z.object({
    profileId: z.uuidv7('Please provide a valid uuid for profileId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    importance: z.number('Please provide a valid importance').min(1).max(5)
})

export type Preference = z.infer<typeof PreferenceModel>

// the `importance` column is NUMERIC in Postgres; the driver returns numeric
// columns as strings (to avoid float precision loss), so rows read back out
// of the database need to be coerced before they satisfy PreferenceModel.
const PreferenceRowModel = PreferenceModel.extend({
    importance: z.coerce.number().min(1).max(5)
})

//
// insert (create) a preference for a profile
// @param preference the preference to insert
// @returns the canonical, database generated preference row

export async function insertPreference (preference: Preference): Promise<Preference> {
    const [row] = await sql`
        INSERT INTO preference (profile_id, interest_id, importance)
        VALUES (${preference.profileId}, ${preference.interestId}, ${preference.importance})
        RETURNING profile_id, interest_id, importance
    `
    return PreferenceRowModel.parse(row)
}

//
// update an existing preference's importance
// @param preference profileId + interestId identify the row; importance is the new value
// @returns the updated preference, or null if no matching row existed

export async function updatePreference (preference: Preference): Promise<Preference | null> {
    const rowList = await sql`
        UPDATE preference
        SET importance = ${preference.importance}
        WHERE profile_id = ${preference.profileId}
          AND interest_id = ${preference.interestId}
        RETURNING profile_id, interest_id, importance
    `
    const result = PreferenceRowModel.array().max(1).parse(rowList)
    return result[0] ?? null
}

//
// select all preferences for a given profile
// @param profileId the profile to get preferences for
// @returns array of preferences

export async function selectPreferencesByProfileId (profileId: string): Promise<Preference[]> {
    const rowList = await sql`
        SELECT profile_id, interest_id, importance
        FROM preference
        WHERE profile_id = ${profileId}
    `
    return PreferenceRowModel.array().parse(rowList)
}
