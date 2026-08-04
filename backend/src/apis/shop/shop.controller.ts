import type {Request, Response} from 'express';
import {selectShopById, insertShop, selectAllShops, selectShopsByFavoriteProfileId} from "./shop.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {type Shop, ShopSchema} from "./shop.model.ts";
import {v7 as uuidv7} from 'uuid';
import {z} from 'zod/v4'





export async function getAllShopsController(request: Request, response: Response):Promise<void> {
    //run select all shops function
    try {
        const shops = await selectAllShops()

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