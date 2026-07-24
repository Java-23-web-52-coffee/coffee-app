import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'

// schema for validating favorites objects-joining user profiles and coffeeshops
// favorites table has profile id and shop id, a pair of foreign keys

export const FavoritesSchema = z.object({
    profileId: z.uuidv7('Please provide a valid uuid for profileId'),
    shopId: z.uuidv7('Please provide a valid uuid for shopId')

})

//favorite type inferred from schema
export type Favorite = z.infer<typeof FavoritesSchema>

// //insert a favorite to profile
// @param favorite the favorite icon to insert
// @returns the canonical, database generated favorite row

export async function insertFavorite (favorite: Favorite): Promise<Favorite> {
    const [row] = await sql`
        INSERT INTO favorite (profile_id, shop_id)
        VALUES (${favorite.profileId}, ${favorite.shopId})
        RETURNING profile_id, shop_id
    `
    return FavoritesSchema.parse(row)
}

// delete a favorite
//profileId the profile that is removing a favorite "unfavoriting"
// shopId the shop the profile is unfavoriting
// returns "favorite successfully deleted"

export async function deleteFavorite (profileId: string, shopId: string): Promise<string> {
    await sql`DELETE
              FROM favorite
              WHERE profile_id = ${profileId}
                AND shop_id = ${shopId}`
    return 'Favorite successfully deleted'
}

//
// /**
//  * Select a single favorite by its composite key
//  * @param profileId the profile that favorited
//  * @param shopId the shop that was favorited
//  * @returns the favorite or null if not found
//  */

export async function selectFavoriteByProfileIdAndShopId (profileId: string, shopId: string): Promise<Favorite | null> {
    const rowList = await sql`
		SELECT profile_id, shop_id
		FROM favorite
		WHERE profile_id = ${profileId} AND shop_id = ${shopId}
	`
    const result = FavoritesSchema.array().max(1).parse(rowList)
    return result[0] ?? null
}

//
// /**
//  * Select all favorites for a given profile
//  * @param profileId the profile to get favorites for
//  * @returns array of favorites
//  */
export async function selectFavoritesByProfileId (profileId: string): Promise<Favorite[]> {
    const rowList = await sql`
		SELECT profile_id, shop_id
		FROM "favorite"
		WHERE profile_id = ${profileId}
	`
    return FavoritesSchema.array().parse(rowList)
}

// select all favorites for a given shop
// @param shopId the shop to get favorites for
// @returns array of favorites

export async function selectFavoritesByShopId (shopId: string): Promise<Favorite[]> {
    const rowList = await sql`
		SELECT profile_id, shop_id
		FROM "favorite"
		WHERE shop_id = ${shopId}
	`
    return FavoritesSchema.array().parse(rowList)
}

