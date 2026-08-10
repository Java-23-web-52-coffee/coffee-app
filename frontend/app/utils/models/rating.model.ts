import {z} from "zod/v4";




export const VisitSchema = z.object ({
    visit_id: z.uuidv7("Please provide a valid visit id").nullable(),
    interest_id: z.uuidv7("Please provide a valid interest id").nullable(),
    value_id: z.uuidv7("Please provide a valid value").nullable(),
})

export type Visit = z.infer<typeof VisitSchema>


//visit id and interest id are paired
//a rating value is given by end user on how accurate the pairing is
// this rating creates the value attavhed to the pair


export async function getAllVisit(): Promise<Visit []>  {
    const response = await fetch(`${process.env.REST_API_URL}/visit`)
    if(!response.ok){
        throw new Error('Failed to fetch visits')
