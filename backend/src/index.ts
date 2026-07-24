import { App } from './App'
import {createClient} from "redis";
import type {RedisClientType} from "redis";
import type { Server } from 'node:http'
import { sql } from './utils/database.utils.ts'

// instantiate new app and pass it a port as an argument to start with (4200)
export let redisClient : RedisClientType | undefined

let server: Server | undefined
let shuttingDown = false


async function main (): Promise<void> {
    if (redisClient === undefined) {
        redisClient = createClient({ socket: { host: process.env.REDIS_HOST } })
        // without an 'error' listener, node-redis re-emits socket errors as an
        // unhandled 'error' event, which crashes the process (e.g. when redis
        // closes the socket during shutdown). swallow errors while shutting down.
        redisClient.on('error', (err) => {
            if (!shuttingDown) console.error('Redis client error:', err)
        })
        redisClient.connect().catch(console.error)
    }
    try {
        const app = new App(redisClient)
        server = app.listen()
    } catch (e) {
        console.log(e)
    }
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })

main().catch(error => { console.error(error) })


// gracefully close the HTTP server, then Redis and Postgres, on process signals
async function shutdown (signal: string): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`Received ${signal}, shutting down gracefully...`)

    // stop accepting new HTTP connections and wait for in-flight requests to finish
    if (server !== undefined) {
        await new Promise<void>((resolve) => server?.close(() => resolve()))
    }

    // close the backing service connections
    await Promise.allSettled([
        redisClient?.quit(),
        sql.end({ timeout: 5 })
    ])

    console.log('Shutdown complete')
    process.exit(0)
}