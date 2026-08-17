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


// A shop as the listing returns it. distanceMiles is optional rather than
// nullable because it is computed per request from the caller's position: a
// search that sent no coordinates has nothing to report and omits the key.
// Absent means "not asked for", never "zero miles away".
export const ShopWithDistanceSchema = ShopSchema.extend({
    distanceMiles: z.coerce.number().min(0).optional()
})


export type ShopWithDistance = z.infer<typeof ShopWithDistanceSchema>


// The caller's position, supplied together or not at all — half a coordinate
// pair locates nothing, so the controller rejects it before this is built.
export interface Origin {
    lat: number
    lng: number
}


// The earth's mean radius in miles, so the haversine below comes out in miles
// with no follow-up conversion.
const EARTH_RADIUS_MILES = 3958.7613


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
 * origin joins that pattern from the other side: it sorts without filtering.
 * There is no radius, so locating the caller reorders the same shops rather
 * than dropping any — which is what keeps it composable with the two filters
 * above instead of fighting them for which one decides the result set.
 *
 * @param term case-insensitive substring of name or address, or undefined for no term filter
 * @param shopIds restricts the result to these shops, or undefined for no restriction
 * @param origin the caller's position, or undefined to order by name and omit distances
 * @returns the matching shops — nearest first when located, by name otherwise
 */
export async function selectShops (term?: string, shopIds?: string[], origin?: Origin): Promise<ShopWithDistance[]> {
    // escape the ILIKE wildcards so a user typing % or _ searches for the literal character
    const pattern = term === undefined ? '' : `%${term.replace(/[\\%_]/g, '\\$&')}%`
    const searchCondition = term === undefined
        ? sql``
        : sql`AND (name ILIKE ${pattern} OR address ILIKE ${pattern})`
    const idCondition = shopIds === undefined
        ? sql``
        : sql`AND id = ANY(${shopIds})`

    // Haversine rather than PostGIS: no extension to install on the class
    // database, and over a city the great-circle error is centimetres. At a
    // few dozen shops the full scan is cheaper than any index would be, so
    // there is nothing here to optimise yet.
    // the ::float8 casts are load-bearing, not decoration: these arrive as bind
    // parameters of unknown type, and Postgres would read the 2 in `2 * $n` as
    // an integer and reject the radius' decimal point
    const distanceColumn = origin === undefined
        ? sql``
        : sql`, 2 * ${EARTH_RADIUS_MILES}::float8 * asin(sqrt(
                power(sin(radians(lat::float8 - ${origin.lat}::float8) / 2), 2)
                + cos(radians(${origin.lat}::float8)) * cos(radians(lat::float8))
                * power(sin(radians(lng::float8 - ${origin.lng}::float8) / 2), 2)
            )) AS distance_miles`

    // name is the tie-break, not just the fallback: two shops at an identical
    // distance would otherwise come back in whatever order the scan produced,
    // and an unstable order makes paging and screenshots disagree
    const ordering = origin === undefined
        ? sql`ORDER BY name`
        : sql`ORDER BY distance_miles, name`

    const rowList = await sql`
        SELECT id, address, hours, lat, lng, name, phone, image_url ${distanceColumn}
        FROM shop
        WHERE true ${searchCondition} ${idCondition}
        ${ordering}
    `
    return ShopWithDistanceSchema.array().parse(rowList)
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
