import 'express-session'

declare module 'express-session' {
    interface SessionData {
        profile?: { id: string, name: string }
        jwt?: string
        signature?: string
    }
}
