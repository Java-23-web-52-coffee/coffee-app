import type {Request, Response} from 'express';
import {selectAllShops} from "./shop.model.ts";
import {sendError, sendServerError} from "../../utils/response.utils.ts";





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