import { Router } from 'express'
import { getShopTagListingsController, getTagsByShopIdController } from './tags.controller.ts'

// the parent resource's base path, matching how ratings.route.ts mounts a
// sub-resource under /apis/visits rather than inventing a path of its own
const basePath = '/apis/shops' as const
const router = Router()

/**
 * GET /apis/shops/:shopId/tags
 * List a shop's derived tags.
 *
 * No isLoggedInController: this is an aggregate over every rater and
 * identifies no profile, so it is public like GET /apis/shops. Nothing here
 * changes state, so there is no CSRF token to check either.
 */
router.route('/:shopId/tags')
    .get(getTagsByShopIdController)

export const tagsRoute = { basePath, router }

// The multi-shop endpoint needs a base path of its own. It cannot live at
// /apis/shops/tags: shopRoute's '/:id' is a single segment, so it would match
// 'tags' first and reject it as a malformed uuid before this router ever saw
// the request.
const listingsBasePath = '/apis/shop-tags' as const
const listingsRouter = Router()

/**
 * GET /apis/shop-tags?shopId=…&shopId=…
 * List tags across many shops in one request. Public, like the route above.
 */
listingsRouter.route('/')
    .get(getShopTagListingsController)

export const shopTagsRoute = { basePath: listingsBasePath, router: listingsRouter }
