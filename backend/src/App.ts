import express, {type Application } from 'express'
import type { Server } from 'node:http'
import morgan from 'morgan'
// Routes
import session from 'express-session'
import type {  RedisClientType } from 'redis'
import {RedisStore} from 'connect-redis'
import {indexRoute} from "./apis/index.route.ts";
import {healthRoute} from "./apis/health/health.route.ts";
import {signUpRoute} from "./apis/sign-up/sign-up.route.ts";
import {signInRoute} from "./apis/sign-in/sign-in.route.ts";
import {signOutRoute} from "./apis/sign-out/sign-out.route.ts";
import {shopRoute} from "./apis/shop/shop.route.ts";
import {myVisitsRoute, visitRoute} from "./apis/visit/visit.route.ts";
import {interestRoute} from "./apis/interest/interest.route.ts";
import {favoritesRoute} from "./apis/favorites/favorites.route.ts";
import {preferenceRoute} from "./apis/preferences/preference.route.ts";
import {ratingsRoute} from "./apis/ratings/ratings.route.ts";
import {shopTagsRoute, tagsRoute} from "./apis/tags/tags.route.ts";

export class App {
    app: Application
    redisStore : RedisStore
    server?: Server

    constructor (  redisClient: RedisClientType
    ) {
        this.redisStore = new RedisStore({client: redisClient})
        this.app = express()
        this.settings()
        this.middlewares()
        this.routes()
    }
    // private method that sets the port for the sever, to one from index.route.ts, and external .env file or defaults to 3000
    public settings (): void {}

    // private method to setting up the middleware to handle json responses, one for dev and one for prod
    private middlewares (): void {

        this.app.use(morgan('dev'))
        this.app.use(express.json())
        this.app.use(session( {
            store: this.redisStore,
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET as string,
            resave: false,
            cookie: {
                maxAge: 3 * 60 * 60 * 1000, // 3h — keep in lockstep with earl-grey's maxAge: 10800
                httpOnly: true
            }
        }))
    }
    // private method for setting up routes in their basic sense (ie. any route that performs an action on profiles starts with /profiles)
    private routes (): void {
        this.app.use(indexRoute.basePath, indexRoute.router)
        this.app.use(healthRoute.basePath, healthRoute.router)
        this.app.use(signUpRoute.basePath, signUpRoute.router)
        this.app.use(signInRoute.basePath, signInRoute.router)
        this.app.use(signOutRoute.basePath, signOutRoute.router)
        this.app.use(shopRoute.basePath, shopRoute.router)
        this.app.use(myVisitsRoute.basePath, myVisitsRoute.router)
        this.app.use(interestRoute.basePath, interestRoute.router)
        this.app.use(favoritesRoute.basePath, favoritesRoute.router)
        this.app.use(preferenceRoute.basePath, preferenceRoute.router)
        // visitRoute and ratingsRoute share /apis/visits; visit owns the
        // single-segment /:id and ratings owns /:visitId/ratings, so the two
        // never match the same URL
        this.app.use(visitRoute.basePath, visitRoute.router)
        this.app.use(ratingsRoute.basePath, ratingsRoute.router)
        // shares /apis/shops with shopRoute — mounted after it so shop's own
        // routes match first; /:shopId/tags is two segments, so shop's /:id
        // never swallows it
        this.app.use(tagsRoute.basePath, tagsRoute.router)
        this.app.use(shopTagsRoute.basePath, shopTagsRoute.router)

    }

    // starts the server and tells the terminal to post a message that the server is running and on what port
    public  listen (): Server {
        this.server = this.app.listen(4200)
        console.log('Express application built successfully')
        return this.server
    }
}