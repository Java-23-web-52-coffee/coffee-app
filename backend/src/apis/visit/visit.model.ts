import {sql} from "../../utils/database.utils.ts";
import {RatingRowModel} from "../ratings/ratings.model.ts";
import {type LoggedVisit, type PostVisitRequest, type Visit, VisitSchema} from "./visit.schema.ts";


//  ------  GET apis/profiles/me/visits ---
// Visits are private logs, so this is always scoped to one profile — there is
// deliberately no "select every visit" query for a route to reach for.
export async function selectVisitsByProfileId (profileId: string): Promise<Visit[]> {
    const rowList = await sql`
        SELECT id, shop_id, profile_id, created_at
        FROM visit
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC`;

    return VisitSchema.array().parse(rowList);
}

// ------- POST apis/profiles/me/visits ------
// The visit row and every rating row commit together or not at all. A bad
// interestId (or shopId) raises a foreign key violation that rolls the whole
// thing back, so a failed submission never leaves a visit with no ratings or
// a half-rated experience behind.
export async function insertVisitWithRatings (
    visit: Visit,
    ratings: PostVisitRequest['ratings']
): Promise<LoggedVisit> {
    return await sql.begin(async (transaction) => {
        const [visitRow] = await transaction`
            INSERT INTO visit(id, shop_id, profile_id, created_at)
            VALUES (${visit.id}, ${visit.shopId}, ${visit.profileId}, ${visit.createdAt})
            RETURNING id, shop_id, profile_id, created_at`

        const ratingRows = await transaction`
            INSERT INTO rating ${transaction(
                ratings.map((rating) => ({
                    visit_id: visit.id,
                    interest_id: rating.interestId,
                    value: rating.value
                }))
            )}
            RETURNING visit_id, interest_id, value`

        return {
            ...VisitSchema.parse(visitRow),
            ratings: RatingRowModel.array().parse(ratingRows)
        }
    })
}

// ------- GET apis/visits/:id ------
export async function selectVisitById(id: string): Promise<Visit | null> {
    const [row] = await sql`
        SELECT id, shop_id, profile_id, created_at
        FROM visit
        WHERE id = ${id}`

    return row ? VisitSchema.parse(row) : null
}
