import type { Request, Response } from 'express'
import type { RedisClientType } from 'redis'
import { sql } from '../../utils/database.utils.ts'
import {redisClient} from "../../index.ts";

/**
 * Health check endpoint controller for monitoring application and service dependencies
 *
 * This endpoint is used by Docker health checks and monitoring systems to verify
 * that the application and its critical dependencies (PostgreSQL and Redis) are
 * operational and responding to requests.
 *
 * @endpoint GET /apis/health
 * @param request Express request object
 * @param response Express response object
 * @returns JSON response with:
 *   - status: 'healthy' or 'unhealthy' (overall application health)
 *   - timestamp: ISO 8601 timestamp of the health check
 *   - services: Object with individual service statuses
 *     - database: 'up', 'down', or 'unknown'
 *     - redis: 'up', 'down', 'not_configured', or 'unknown'
 *
 * @statusCodes
 *   - 200: All services are healthy and operational
 *   - 503: One or more services are down or not responding
 */
export async function healthCheckController(request: Request, response: Response): Promise<void> {
    // Initialize health status response object with default values
    const healthStatus: {
        status: string
        timestamp: string
        services: {
            database: string
            redis: string
        }
    } = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            redis: 'unknown'
        }
    }

    // Track overall health - will be set to false if any service fails
    let isHealthy = true

    // Database health check - verify PostgreSQL connection with simple query
    try {
        await sql`SELECT 1 as health_check`
        healthStatus.services.database = 'up'
    } catch (error) {
        console.log(error)
        healthStatus.services.database = 'down'
        isHealthy = false
    }

    // Redis health check - verify connection and basic read/write operations
    try {
        if (redisClient === undefined) {
            healthStatus.services.redis = 'not_configured'
            isHealthy = false
        } else {
            // Use a 2-second timeout to prevent the health check from hanging
            // if Redis becomes unresponsive
            const HEALTH_CHECK_TIMEOUT = 2000
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Redis health check timeout')), HEALTH_CHECK_TIMEOUT)
            })

            // Test Redis connectivity and basic operations:
            // 1. PING - verify Redis is responding
            // 2. SET - verify write capability with 10-second expiration
            // 3. GET - verify read capability
            const testKey = 'health:check'
            const testValue = Date.now().toString()

            await Promise.race([redisClient.ping(), timeout])
            await Promise.race([redisClient.set(testKey, testValue, { EX: 10 }), timeout])
            await Promise.race([redisClient.get(testKey), timeout])

            healthStatus.services.redis = 'up'
        }
    } catch (error) {
        healthStatus.services.redis = 'down'
        isHealthy = false
    }

    // Set overall application health status based on service checks
    healthStatus.status = isHealthy ? 'healthy' : 'unhealthy'

    // Return 200 OK if healthy, 503 Service Unavailable if any service is down
    const statusCode = isHealthy ? 200 : 503

    response.status(statusCode).json(healthStatus)
}