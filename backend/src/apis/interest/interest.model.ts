import {sql} from "../../utils/database.utils.ts";
import {z} from 'zod/v4'

export const InterestModel = z.object({
    id: z.uuidv7('Please provide a valid id').nullable(),
    category: z.string('Please provide a valid category'),
})

export type Interest = z.infer<typeof InterestModel>

export async function selectAllInterest (): Promise<Interest[]> {
    const rowList = await sql`SELECT id, category FROM interest`
    return InterestModel.array().parse(rowList)
}

export async function insertInterest (interest: Interest): Promise<Interest> {
    InterestModel.parse(interest)
    const {id, category} = interest
    const [row] = await sql`INSERT INTO interest(id, category) VALUES (${id}, ${category}) RETURNING id, category`
    return InterestModel.parse(row)
}