import { Router } from 'express'
import {
    postFavoritesController,
    deleteFavoritesController,
    getFavoriteByPrimaryKeyController,
    getFavoritesByShopIdController,
    getFavoritesByProfileIdController
} from './favorites.controller.ts'

// flat routes for the favorite resource; nested equivalents live in shop.route.ts
const basePath = '/apis/favorites' as const
const router = Router()

/**
 * POST /apis/favorite  { shopId }
 * Favorite a shop (requires authentication)
 */
router.route('/')
    .post(postFavoritesController)

/**
 * GET /apis/favorite/shop/:shopId
 * Get all favorites on a shop
 */
router.route('/shop/:shopId')
    .get(getFavoritesByShopIdController)

/**
 * GET /apis/favorite/profile/:profileId
 * Get all favorites made by a profile
 */
router.route('/profile/:profileId')
    .get(getFavoritesByProfileIdController)

/**
 * GET /apis/favorite/profile/:profileId/shop/:shopId
 * Get a single favorite by its composite primary key
 */
router.route('/profile/:profileId/shop/:shopId')
    .get(getFavoriteByPrimaryKeyController)

/**
 * DELETE /apis/favorite/:shopId
 * Unfavorite a shop (requires authentication)
 */
router.route('/:shopId')
    .delete(deleteFavoritesController)

export const favoritesRoute = { basePath, router }
