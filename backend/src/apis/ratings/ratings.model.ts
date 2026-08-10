import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'

//
// schema for validating rating objects along with scoring an interest for a visit
// rating table contains visitId, interestId, and value.

export const RatingModel = z.object({
    visitId: z.uuidv7('Please provide a valid uuid for visitId'),
    interestId: z.uuidv7('Please provide a valid uuid for interestId'),
    value: z.number('Please provide a valid rating value').min(1).max(5)
})

export type Rating = z.infer<typeof RatingModel>

// the `value` column is NUMERIC in Postgres; the driver returns numeric
// columns as strings (to avoid float precision loss), so rows read back out
// of the database need to be coerced before they satisfy RatingModel.
const RatingRowModel = RatingModel.extend({
    value: z.coerce.number().min(1).max(5)
})

//
// insert (create) a rating for a visit
// @param rating the rating to insert
// @returns the canonical, database generated rating row

export async function insertRating (rating: Rating): Promise<Rating> {
    const [row] = await sql`
        INSERT INTO rating (visit_id, interest_id, value)
        VALUES (${rating.visitId}, ${rating.interestId}, ${rating.value})
        RETURNING visit_id, interest_id, value
    `
    return RatingRowModel.parse(row)
}

//
// update an existing rating's value
// @param rating visitId + interestId identify the row; value is the new score
// @returns the updated rating, or null if no matching row existed

export async function updateRating (rating: Rating): Promise<Rating | null> {
    const rowList = await sql`
        UPDATE rating
        SET value = ${rating.value}
        WHERE visit_id = ${rating.visitId}
          AND interest_id = ${rating.interestId}
        RETURNING visit_id, interest_id, value
    `
    const result = RatingRowModel.array().max(1).parse(rowList)
    return result[0] ?? null
}

//
// select all ratings for a given visit
// @param visitId the visit to get ratings for
// @returns array of ratings

export async function selectRatingsByVisitId (visitId: string): Promise<Rating[]> {
    const rowList = await sql`
        SELECT visit_id, interest_id, value
        FROM rating
        WHERE visit_id = ${visitId}
    `
    return RatingRowModel.array().parse(rowList)
}