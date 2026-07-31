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
//
// insert (set) preference for a profile
// @param preference the preference to insert
// @returns the canonical, database generated preference.row

// export async function setPreference (preference: Preference): Promise<Preference> {
//     const [row] = await sql
//         INSERT INTO preference (profile_id, interest_id, importance)
//         VALUES (${preference.profileId}, ${preference.interestId}, ${preference.importance})
//     RETURNING profile_id, interest_id, importance
//
//     return PreferenceModel.parse(row)
// }
//
// export async function selectAllInterest (): Promise<Preference[]> {
//     const rowList = await sql\`SELECT id, category FROM interest\`
//     return InterestModel.array().parse(rowList)
