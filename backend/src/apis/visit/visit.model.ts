import {sql} from "../../utils/database.utils.ts";
import {type Visit, VisitSchema} from "./visit.schema.ts";





//  ------  GET apis/profiles/me/visits ---
export async function selectAllVisits (): Promise<Visit[]> {
    const rowList = await sql`SELECT id, shop_id, profile_id, created_at FROM visit`;

    return VisitSchema.array().parse(rowList);
}

// ------- POST apis/visit ------
export async function insertVisit(visit: Visit): Promise<Visit> {
    VisitSchema.parse(visit)

    const {id, shopId, profileId, createdAt } = visit

    const [row] = await sql`
        INSERT INTO visit(id, shop_id, profile_id, created_at) 
        VALUES (${id}, ${shopId}, ${profileId}, ${createdAt}) 
        RETURNING id, shop_id, profile_id, created_at`

    return VisitSchema.parse(row)
}

// ------- GET apis/visit/:id ------
export async function selectVisitById(id: string): Promise<Visit | null> {
    const [row] = await sql`
        SELECT id, shop_id, profile_id, created_at 
        FROM visit 
        WHERE id = ${id}`

    return row ? VisitSchema.parse(row) : null
}