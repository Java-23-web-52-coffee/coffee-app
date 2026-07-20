import type { Request, Response } from 'express'
import type {ZodError} from "zod/v4";
import {STATUS_CODES} from "node:http";




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
