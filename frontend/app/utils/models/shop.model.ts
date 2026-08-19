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


// distanceMiles is optional because the server computes it per request from the
// caller's position: an unlocated search omits the key entirely. Absent means
// "we did not ask", not "zero miles away" — hence `undefined`, never a 0 default
export const ShopWithDistanceSchema = ShopSchema.extend({
    distanceMiles: z.coerce.number().min(0).optional()
})


export type ShopWithDistance = z.infer<typeof ShopWithDistanceSchema>


// The visitor's position. Supplied as a pair or not at all — the server rejects
// half of one, so there is no point assembling a partial origin here
export interface Origin {
    lat: number
    lng: number
}


/**
 * Read a whole position out of the URL, or undefined when it does not carry one.
 *
 * Deliberately more forgiving than the API, which 400s a half pair: a partial or
 * malformed lat/lng in the URL means a hand-edited, truncated, or half-copied
 * link, and dropping back to the name-ordered list gives the visitor a working
 * page instead of an error they have no way to act on. The strict check still
 * happens server-side for clients that built the request themselves.
 *
 * @param searchParams the search page's query string
 * @returns the position, or undefined to leave the listing ordered by name
 */
export function readOrigin(searchParams: URLSearchParams): Origin | undefined {
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    // checked as strings first: Number('') is 0, a real point on the equator
    if(latParam === null || lngParam === null || latParam.trim() === '' || lngParam.trim() === '') {
        return undefined
    }
    const lat = Number(latParam)
    const lng = Number(lngParam)
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return undefined
    }
    if(lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return undefined
    }
    return {lat, lng}
}

export async function getAllShops(searchTerm?: string, interestIds?: string[], origin?: Origin): Promise<ShopWithDistance[]> {
    const url = new URL(`${process.env.REST_API_URL}/shops`)
    if(searchTerm) {
        url.searchParams.set('q', searchTerm)
    }
    // repeatable, and ANDed by the server: a shop must carry every tag listed
    interestIds?.forEach((interestId) => url.searchParams.append('interestId', interestId))
    // sorts rather than filters: sending a position reorders the same shops
    // nearest-first and adds a distance to each, without dropping any
    if(origin) {
        url.searchParams.set('lat', String(origin.lat))
        url.searchParams.set('lng', String(origin.lng))
    }
    const response = await fetch(url)
    if(!response.ok) throw new Error(`Failed to fetch shops: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopWithDistanceSchema.array().parse(data)

}

export async function getShopById(id: string): Promise<Shop> {
    const url = new URL(`${process.env.REST_API_URL}/shops/${id}`)
    const response = await fetch(url)
    if(!response.ok) throw new Error(`Failed to fetch shop: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopSchema.parse(data)
}

export async function getFavoriteShops(authorization : string, cookie?: string | null): Promise<Shop[]> {
    const url = new URL(`${process.env.REST_API_URL}/shops/favorite/profile`)
    const headers: HeadersInit = {
        'Authorization': authorization,
        'Content-Type': 'application/json'

    }
    if(cookie){
        headers['Cookie'] = cookie
    }
    const response = await fetch(url, {headers: headers, method: 'GET', credentials: "include"})
    if(!response.ok) throw new Error(`Failed to fetch favorite shops: ${response.status} ${response.statusText}`)
    const data = await response.json()
    return ShopSchema.array().parse(data)
}

export async function getFavoriteShopsByProfileId(id: string): Promise<Shop[]> {
    const response = await fetch(`/apis/shop/favorite/${id}`)
    if(!response.ok) {
        throw new Response("Failed to get favorite shops", { status: response.status })
    }
    return response.json()

}