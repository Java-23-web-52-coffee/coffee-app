import type { Request, Response } from 'express'
import { z } from 'zod/v4'
import { type ShopTag, type ShopTagListing, selectTagListings, selectTagsByShopId } from './tags.model.ts'
import { selectShopById } from '../shop/shop.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

/**
 * Express controller for listing a shop's derived tags.
 *
 * No session check: the response is an aggregate over every rater and
 * identifies no profile, so it is public like GET /apis/shops.
 *
 * @endpoint GET /apis/shops/:shopId/tags
 * @returns 200 with the tag array — empty when no interest clears both
 *          thresholds — or an ErrorResponse (400/404/500)
 */
export async function getTagsByShopIdController (request: Request, response: Response): Promise<void> {
    try {
        const paramResult = z.uuidv7('Please provide a valid uuid for shopId')
            .safeParse(request.params.shopId)
        if (!paramResult.success) {
            sendZodError(request, response, paramResult.error)
            return
        }
        const shopId = paramResult.data

        // The aggregation returns zero rows both for a real shop nobody has
        // rated yet and for a shopId that does not exist. Only this lookup
        // separates them, and the two answers are different: an empty array
        // is what the frontend renders its "no tags yet" state from, while a
        // made-up id has to be a 404.
        const shop = await selectShopById(shopId)
        if (shop === null) {
            sendError(request, response, 404, `No shop exists with an id equal to ${shopId}`)
            return
        }

        const tags: ShopTag[] = await selectTagsByShopId(shopId)
        response.json(tags)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

// Express hands back a bare string for one ?shopId= and an array for several,
// so both shapes are normalised before validation
const ShopIdQueryModel = z.union([
    z.uuidv7('Please provide a valid uuid for shopId'),
    z.uuidv7('Please provide a valid uuid for shopId').array().max(100)
])
    .optional()
    .transform(value => value === undefined ? undefined : (Array.isArray(value) ? value : [value]))

/**
 * Express controller for listing tags across many shops.
 *
 * Public for the same reason as getTagsByShopIdController. There is no 404
 * here: `shopId` is a filter rather than a resource lookup, so ids matching
 * no shop just contribute no rows.
 *
 * @endpoint GET /apis/shop-tags?shopId=…&shopId=…
 * @returns 200 with the tag array — empty when nothing qualifies — or an
 *          ErrorResponse (400/500)
 */
export async function getShopTagListingsController (request: Request, response: Response): Promise<void> {
    try {
        const queryResult = ShopIdQueryModel.safeParse(request.query.shopId)
        if (!queryResult.success) {
            sendZodError(request, response, queryResult.error)
            return
        }

        const listings: ShopTagListing[] = await selectTagListings(queryResult.data)
        response.json(listings)
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}
