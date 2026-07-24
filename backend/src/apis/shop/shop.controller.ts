import type {Request, Response} from 'express';
import {insertShop, selectAllShops} from "./shop.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {sql} from "../../utils/database.utils.ts";
import {type Shop, ShopSchema} from "./shop.model.ts";
import {v7 as uuidv7} from 'uuid';





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