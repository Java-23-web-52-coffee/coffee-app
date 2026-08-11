import { z } from 'zod/v4'

export const VisitSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id').nullable(),
    shopId: z.uuidv7('Please provide a valid shop id'),
    profileId: z.uuidv7('Please provide a valid profile id'),
    createdAt: z.coerce.date(),
})

export type Visit = z.infer<typeof VisitSchema>

export async function getVisitById(id: string): Promise<Visit> {
    const url = new URL(`${process.env.REST_API_URL}/visit/${id}`)
    const response = await fetch(url)
    if (!response.ok) {
        const error = new Error(`Failed to fetch visit: ${response.status} ${response.statusText}`)
        ;(error as { status?: number }).status = response.status
        throw error
    }
    const data = await response.json()
    return VisitSchema.parse(data)
}
