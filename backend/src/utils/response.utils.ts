import type { Request, Response } from 'express'
import type { Status } from './interfaces/Status'
import type {ZodError} from "zod/v4";
import {STATUS_CODES} from "node:http";

/**
 * factory function that creates a status object to send back to the client
 * @param status an integer representing the status code
 * @param data to send back to the client
 * @param message
 */
export function createStatus (status: number, data: unknown, message: string | null): Status {
    return { status, data, message }
}

/**
 * helper function that sends an error response when a zod validation error occurs
 * @param response an object modeling the response that will be sent to the client.
 * @param error an object containing the errors from zod validation
 */
export function zodErrorResponse (response: Response, error: ZodError): Response<Status> {
    let message = 'validation error occurred'
    if( error.issues[0]) {
        message = error.issues[0].message
    }
    return errorResponse(response, createStatus(418, null, message))

}

/**
 * helper function that sends an error response when a error occurs
 * @param response
 * @param status
 */
export function errorResponse (response: Response, status: Status): Response<Status> {
    return response.json(status)
}

/**
 * helper function that sends an error response when a server error occurs
 * @param response an object modeling the response that will be sent to the client.
 * @param defaultDataValue default value to send back to the client to help with rendering when an error occurs
 */
export function serverErrorResponse (response: Response, defaultDataValue: unknown = null): Response<Status> {
    return errorResponse(response, createStatus(500, defaultDataValue, 'internal server error occurred try again later'))
}

export interface ErrorResponse {
    timestamp: string
    status: number
    error: string
    message: string
    path: string
    details?: unknown
}

export function sendError (request: Request, response: Response, status: number, message: string, details?: unknown): void {
    const body: ErrorResponse = {
        timestamp: new Date().toISOString(),
        status,
        error: STATUS_CODES[status] ?? 'Error',
        message,
        path: request.originalUrl
    }

    // only include details when the caller actually supplied them
    if (details !== undefined) {
        body.details = details
    }

    response.status(status).json(body)
}

export function sendZodError (request: Request, response: Response, error: ZodError): void {
    const message = error.issues[0]?.message ?? 'A validation error occurred'
    const details = {
        issues: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
        }))
    }
    sendError(request, response, 400, message, details)
}
/**
 * Sends a 500 Internal Server Error with a generic message.
 *
 * Used in controller catch blocks for unexpected failures, so internals are
 * never leaked and every "something went wrong" response is identical.
 *
 * @param request the Express request (used to populate the `path` field)
 * @param response the Express response to send on
 */
export function sendServerError (request: Request, response: Response): void {
    sendError(request, response, 500, 'internal server error occurred try again later')
}
