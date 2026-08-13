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


/**
 * select shops, narrowed by any combination of the filters the listing accepts
 *
 * The filters compose rather than branch: each one contributes a fragment or
 * nothing, so a term and an id restriction together is the same query as
 * either alone. WHERE true is what lets every fragment start with AND.
 *
 * shopIds is deliberately not "the shops to look up" — it is a restriction
 * computed elsewhere (today, the shops carrying every selected tag), which is
 * why an empty array here would correctly return nothing.
 *
 * @param term case-insensitive substring of name or address, or undefined for no term filter
 * @param shopIds restricts the result to these shops, or undefined for no restriction
 * @returns the matching shops, by name
 */
export async function selectShops (term?: string, shopIds?: string[]): Promise<Shop[]> {
    // escape the ILIKE wildcards so a user typing % or _ searches for the literal character
    const pattern = term === undefined ? '' : `%${term.replace(/[\\%_]/g, '\\$&')}%`
    const searchCondition = term === undefined
        ? sql``
        : sql`AND (name ILIKE ${pattern} OR address ILIKE ${pattern})`
    const idCondition = shopIds === undefined
        ? sql``
        : sql`AND id = ANY(${shopIds})`

    const rowList = await sql`
        SELECT id, address, hours, lat, lng, name, phone, image_url
        FROM shop
        WHERE true ${searchCondition} ${idCondition}
        ORDER BY name
    `
    return ShopSchema.array().parse(rowList)
}

export async function selectShopsByFavoriteProfileId (id: string): Promise<Shop[]> {
    const rowList = await sql`SELECT id, address, hours, lat, lng, name, phone, image_url FROM shop inner join favorite on shop.id = favorite.shop_id where favorite.profile_id = ${id}`
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

    const result = ShopSchema.array().max(1).parse(rowList)
    return result[0] ?? null

}
