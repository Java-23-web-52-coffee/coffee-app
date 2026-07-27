import {z} from 'zod/v4'


export const ShopSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id').nullable(),
    address: z.string('Please provide a valid address'),
    hours: z.object({
        monday: z.string().max(32),
        tuesday: z.string().max(32),
        wednesday: z.string().max(32),
        thursday: z.string().max(32),
        friday: z.string().max(32),
        saturday: z.string().max(32),
        sunday: z.string().max(32),
    }).partial(),
    lat: z.coerce.number('Please provide a valid latitude')
        .min(-90)
        .max(90),
    lng: z.coerce.number('Please provide a valid longitude')
        .min(-180)
        .max(180),
    name: z.string('Please provide a valid name')
        .min(1)
        .max(63),
    phone: z.string('Please provide a valid phone number')
        .min(10)
        .max(31),
    imageUrl: z.url('Please provide a valid image url')
        .max(255)
})


export type Shop = z.infer<typeof ShopSchema>

export async function getAllShops(): Promise<Shop[]> {
    const url = new URL(`${process.env.REST_API_URL}/shops`)
    const response = await fetch(url)
    if(!response.ok) throw new Error(`Failed to fetch shops: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopSchema.array().parse(data)

}

export async function getShopById(id: string): Promise<Shop> {
    const url = new URL(`${process.env.REST_API_URL}/shops/${id}`)
    const response = await fetch(url)
    if(!response.ok) throw new Error(`Failed to fetch shop: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopSchema.parse(data)
}