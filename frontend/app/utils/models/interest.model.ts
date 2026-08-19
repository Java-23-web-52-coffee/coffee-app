import {z} from "zod/v4";
import {favoriteSchema} from "~/utils/models/favorite.model";


export const InterestSchema = z.object ({
    id:z.uuidv7("Please provide a valid interest id").nullable(),
    category:z.string("please provide a valid category")
})

export type Interest = z.infer<typeof InterestSchema>

export async function getAllInterest(): Promise<Interest []>  {
    const response = await fetch(`${process.env.REST_API_URL}/interest`)
    if(!response.ok){
        throw new Error('Failed to fetch interests')
        
    }
    const data = await response.json();
    return InterestSchema.array().parse(data)
}

