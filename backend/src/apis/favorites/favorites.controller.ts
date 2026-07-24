import type { Request, Response } from 'express'

import {
    type Favorite,
    insertFavorite,
    deleteFavorite,
    selectFavoriteByProfileIdAndShopId,
    selectFavoritesByProfileId,
    selectFavoritesByShopId,
    FavoritesSchema
} from './favorites.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

// Postgres SQLSTATEs we translate into meaningful HTTP responses
const UNIQUE_VIOLATION = '23505' // duplicate favorite (already favorited)
const FOREIGN_KEY_VIOLATION = '23503' // shop does not exist

// /**
//  * Express controller for favoriting a shop.
//  *
//  * The actor (profileId) is taken from the session; the shop comes from either
//  * the nested route param (`/apis/shop/:shopId/favorite`) or the flat request
//  * body (`POST /apis/favorite { shopId }`).
//  *
//  * @endpoint POST /apis/favorite  |  POST /apis/shop/:shopId/favorite
//  * @returns 201 with the created favorite, or an ErrorResponse (400/401/404/409/500)
//  */

export async function postFavoritesController (request: Request, response: Response): Promise<void> {
    try {
        // ShopId comes from the nested param, falling back to the flat body
        const shopId = request.params.shopId ?? request.body?.shopId
        const validationResult = FavoritesSchema.pick({ shopId: true }).safeParse({ shopId })
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to favorite a shop')
            return
        }

        const favorite: Favorite = {
            profileId: profile.id,
            shopId: validationResult.data.shopId,
        }

        // insert returns the canonical, database-generated row directly
        const createdFavorite = await insertFavorite(favorite)

        response
            .status(201)
            .location(`/apis/shop/${createdFavorite.shopId}/favorite`)
            .json(createdFavorite)
    } catch (error: any) {
        // a repeat favorite is an expected conflict; a missing shop is a 404
        if (error?.code === UNIQUE_VIOLATION) {
            sendError(request, response, 409, 'You have already favorited this shop')
            return
        }
        if (error?.code === FOREIGN_KEY_VIOLATION) {
            sendError(request, response, 404, 'No shop exists with that id')
            return
        }
        console.error(error)
        sendServerError(request, response)
    }
}
//
// /**
//  * Express controller for unliking a shop.
//  *
//  * Idempotent: returns 204 whether a favorite existed, since the desired end
//  * state (not favorited) is reached either way.
//  * * @endpoint DELETE /apis/favorite/:shopId  |  DELETE /apis/shop/:shopId/favorite
//  *  * @returns 204 No Content, or an ErrorResponse (400/401/500)
//

export async function deleteFavoritesController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = FavoritesSchema.pick({ shopId: true }).safeParse({ shopId: request.params.shopId })
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const profile = request.session?.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to unlike a shop')
            return
        }

        await deleteFavorite(profile.id, validationResult.data.shopId)

        response.status(204).send()
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
//
// /**
//  * Express controller for getting all favotites on a shops.
//  *
//  * @endpoint GET /apis/favorite/shop/:shopId  |  GET /apis/shop/:shopId/favorite
//  * @returns 200 with an array of favorites, or an ErrorResponse (400/500)
//  */

export async function getFavoritesByShopIdController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = FavoritesSchema.pick({ shopId: true }).safeParse({ shopId: request.params.shopId })
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const favorites = await selectFavoritesByShopId(validationResult.data.shopId)

        response.status(200).json(favorites)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for getting a single favorite by its composite primary key.
 *
 * @endpoint GET /apis/favorite/profile/:profileId/shop/:shopId
 *           |  GET /apis/shop/:shopId/favorite/:profileId
 * @returns 200 with the favorite, 404 if none exists, or an ErrorResponse (400/500)
 */
export async function getFavoriteByPrimaryKeyController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = FavoritesSchema.pick({ profileId: true, shopId: true }).safeParse({
            profileId: request.params.profileId,
            shopId: request.params.shopId
        })
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const { profileId, shopId } = validationResult.data

        const favorite = await selectFavoriteByProfileIdAndShopId(profileId, shopId)
        if (favorite === null) {
            sendError(request, response, 404, 'No favorite exists for that profile and shop')
            return
        }

        response.status(200).json(favorite)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

/**
 * Express controller for getting all favorites made by a profile.
 *
 * @endpoint GET /apis/favorite/profile/:profileId
 * @returns 200 with an array of favorites, or an ErrorResponse (400/500)
 */
export async function getFavoritesByProfileIdController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = FavoritesSchema.pick({ profileId: true }).safeParse({ profileId: request.params.profileId })
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }

        const likes = await selectFavoritesByProfileId(validationResult.data.profileId)

        response.status(200).json(likes)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}