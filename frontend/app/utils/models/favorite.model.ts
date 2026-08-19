import {z} from 'zod/v4'
import {ShopSchema} from "~/utils/models/shop.model";
import {threadId} from "node:worker_threads";


export const favoriteSchema = z.object({
    profileId: z.uuidv7('Please provide a valid uuid for profileId'),
    shopId: z.uuidv7('Please provide a valid uuid for shopId'),
})

export type Favorite = z.infer<typeof favoriteSchema>

export async function getFavorite(shopId: string, profileId: string): Promise<Favorite | null> {
    const url = new URL(`${process.env.REST_API_URL}/favorites/profile/${profileId}/shop/${shopId}`)
    const response = await fetch(url)
    if(response.status === 404){
        return null
    }
    const favorite = await response.json()
    return favoriteSchema.parse(favorite)
}

export async function postFavorite(shopId: string, profileId: string, authorization: string, cookie?: string | null): Promise<number> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': authorization
    }
    if (cookie) {
        headers['Cookie'] = cookie
    }

    const response = await fetch(`${process.env.REST_API_URL}/favorites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shopId, profileId }),
        credentials: "include"
})

    return response.status
}


export async function deleteFavorite(shopId: string, profileId: string, authorization: string, cookie?: string | null): Promise<number> {
   const headers: HeadersInit = {
       'Content-Type': 'application/json',
       'Authorization': authorization
   }
   if (cookie) {
       headers['Cookie'] = cookie
   }

   const response = await fetch(`${process.env.REST_API_URL}/favorites/${shopId}`, {
       method: 'DELETE',
       headers,
       credentials: 'include'
   })

    return response.status
}