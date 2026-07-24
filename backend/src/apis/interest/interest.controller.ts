import type {Request, Response} from "express";
import {sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {type Interest, InterestModel, insertInterest, selectAllInterest} from "./interest.model.ts";
import {v7 as uuidv7} from "uuid";


export async function getAllInterestsController(request: Request, response: Response):Promise<void> {
    //run select all interests function
    try {
        const interests = await selectAllInterest()

        //prepare response with interests from database
        response.json(interests)

        //catch any errors
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)

    }
}

export async function postInterestController(request : Request, response : Response): Promise<void> {

    try {
        // validate the interest request body
        const validationResult = InterestModel.safeParse(request.body)
        if (!validationResult.success) {
            sendZodError(request, response, validationResult.error)
            return
        }
        const {category} = validationResult.data

        const interest : Interest = {
            id: uuidv7(),
            category: category,
        }
        const createdInterest = await insertInterest(interest)
        response
            .status(201)
            .location(`/apis/interest/${createdInterest.id}`)
            .json(createdInterest)


    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }
}