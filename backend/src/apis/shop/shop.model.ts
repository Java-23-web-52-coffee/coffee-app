import {sql} from "../../utils/database.utils.ts";
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


export async function selectAllShops (): Promise<Shop[]> {
    const rowList = await sql`SELECT id, address, hours, lat, lng, name, phone, image_url FROM shop`
    return ShopSchema.array().parse(rowList)
}

export async function insertShop(shop: Shop): Promise<Shop> {
    ShopSchema.parse(shop)
    const {id, address, hours, lat, lng, name, phone, imageUrl} = shop
    const [row] = await sql`INSERT INTO shop(id, address, hours, lat, lng, name, phone, image_url) VALUES (${id}, ${address}, ${sql.json(hours)}, ${lat}, ${lng}, ${name}, ${phone}, ${imageUrl}) RETURNING id,address, hours, lat, lng, name, phone, image_url`
    return ShopSchema.parse(row)
}

export async function selectShopById(id: string): Promise<Shop | null> {
const rowList = await sql`SELECT id, address, hours, lat, lng, name, phone, image_url FROM shop WHERE id = ${id}`

}
