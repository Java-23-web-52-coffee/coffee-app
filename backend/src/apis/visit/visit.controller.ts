import type {Request, Response} from 'express';
import {insertVisit, selectAllVisits, selectVisitById} from "./visit.model.ts";
import {sendError, sendServerError, sendZodError} from "../../utils/response.utils.ts";
import {PostVisitSchema, type Visit} from "./visit.schema.ts";
import {v7 as uuidv7} from "uuid";


export async function getAllVisitsController (request: Request, response: Response): Promise<void> {

    //run select all visits function
    try {
        const visits = await selectAllVisits()

        //prepare response with shops from database
        response.json(visits)

        //catch any errors
    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)

    }

}

export async function postVisitController(request: Request, response: Response): Promise<void> {

try{
    // validate the visit request body
    const validationResult = PostVisitSchema.safeParse(request.body)
    if (!validationResult.success) {
        sendZodError(request, response, validationResult.error)
        return
    }

    const profile = request.session.profile
    if (profile === undefined || profile === null) {
        sendError(request, response, 401, 'Please login to post a visit')
        return
    }




    const {shopId} = validationResult.data
    // assemble the full visit with server-owned fields

    const visit : Visit = {
        id: uuidv7(),
        shopId,
        profileId: profile.id,
        createdAt: new Date()
    }
    const createdVisit = await insertVisit(visit)

    response
        .status(201)
        .location(`/apis/visit/${visit.id}`)
        .json(createdVisit)


} catch (error: any) {
    console.error(error)
    sendServerError(request, response)
}
}


export async function getVisitByIdController(request: Request, response: Response): Promise<void> {
    try{
        const { id } = request.params

        if (typeof id !== "string") {
            sendError(request, response, 400, "Please provide a valid visit id")
            return
        }
        const visit = await selectVisitById(id)

        if (visit === null) {
            sendError(request, response, 404, "Visit not found")
            return
    }

        response.status(200).json(visit)

    } catch (error: any) {
        console.error(error)
        sendServerError(request, response)
    }

}