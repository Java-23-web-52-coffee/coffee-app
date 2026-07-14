import postgres from 'postgres'

const port = process.env.POSTGRES_PORT ?? '0'
const parsedPort = parseInt(port)

export const sql = postgres({
    user: process.env.POSTGRES_USER,
    port: parsedPort,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: 'require',
    transform: {
        column: {
            from: postgres.toCamel, to: postgres.fromCamel
        }
    }
})