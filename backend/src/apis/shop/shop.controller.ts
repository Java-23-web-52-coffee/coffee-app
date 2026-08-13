import type {Request, Response} from 'express';
import {
    selectShopById,
    insertShop,
    selectShops,
    selectShopsByFavoriteProfileId
} from "./shop.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {type Shop, ShopSchema} from "./shop.model.ts";
import {selectShopIdsWithAllTags} from "../tags/tags.model.ts";
import {v7 as uuidv7} from 'uuid';
import {z} from 'zod/v4'

// Express hands back a bare string for one ?interestId= and an array for
// several, so both shapes are normalised before validation — the same idiom
// the shop-tags listing uses for its repeatable shopId
const InterestIdQueryModel = z.union([
    z.uuidv7('Please provide a valid uuid for interestId'),
    z.uuidv7('Please provide a valid uuid for interestId').array().max(100)
])
    .optional()
    .transform(value => value === undefined ? undefined : (Array.isArray(value) ? value : [value]))

export async function getAllShopsController(request: Request, response: Response):Promise<void> {
    try {
        // an absent or blank q means "list everything", so empty strings collapse to undefined
        const validationResult = z.string('Please provide a valid search term')
            .trim()
            .max(63)
            .transform(term => term.length === 0 ? undefined : term)
            .optional()
            .safeParse(request.query.q)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }
        const searchTerm = validationResult.data

        const interestResult = InterestIdQueryModel.safeParse(request.query.interestId)
        if (!interestResult.success) {
            sendZodError(request, response, interestResult.error)
            return
        }
        const interestIds = interestResult.data

        // with no tags selected the tag aggregation never runs, so the plain
        // search costs exactly what it did before
        const shopIds = interestIds === undefined
            ? undefined
            : await selectShopIdsWithAllTags(interestIds)

        // no shop cleared every selected tag. This has to answer with an empty
        // list rather than fall through, because an undefined restriction means
        // "no filter" and would return every shop
        if (shopIds !== undefined && shopIds.length === 0) {
            response.json([])
            return
        }

        //run the shop listing, narrowed by whichever filters were supplied
        const shops = await selectShops(searchTerm, shopIds)

        //prepare response with shops from database
        response.json(shops)

        //catch any errors
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)

    }
}

export async function postShopController(request : Request, response : Response): Promise<void> {


    try {
        // validate the shop request body (content + optional reply/image only)
        const validationResult = ShopSchema.safeParse(request.body)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }
const {address, hours, lat, lng, name, phone, imageUrl} = validationResult.data
        // assemble the full shop, assigning the server-owned fields
    const shop : Shop = {
            id: uuidv7(),
            address,
            hours,
            lat,
            lng,
            name,
            phone,
            imageUrl
        }
    const createdShop = await insertShop(shop)
        response
            .status(201)
            .location(`/apis/shop/${shop.id}`)
            .json(createdShop)


    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}

export async function getShopByIdController(request: Request, response: Response):Promise<void> {
    //run select all shops function
    try {
        const validationResult = z.uuidv7('Please provide a valid uuid for id').safeParse( request.params.id)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }
        const  id = validationResult.data

        const shop: Shop | null = await selectShopById(id)
        if (shop === null) {
            sendError(request, response, 404, `No shop exists with an id equal to ${id}`)
            return
        }
            response.json(shop)
        //catch any errors
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)

    }
}

export async function getShopsByFavoriteProfileId ( request: Request, response: Response)  {
    try{
        const profile = request.session.profile
        if (profile === undefined || profile === null) {
            sendError(request, response, 401, 'Please login to post a visit')
            return
        }
        const shop = await selectShopsByFavoriteProfileId(profile.id)
        response.status(200).json(shop)
    } catch (error) {
        console.error(error)
        response.status(500).json({error: 'failed to get shop'})
    }
}