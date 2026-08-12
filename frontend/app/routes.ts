
import {type RouteConfig, index, layout, route} from "@react-router/dev/routes";


export default [
    layout('./layouts/nav/navbar.tsx', [
        index("routes/home.tsx"),
        route('/search-page','routes/search-page.tsx'),
        route('/shop/:id','routes/shop-page.tsx'),
        route('/saved','routes/saved/saved.tsx'),
        route('/experience-log/:shopId', 'routes/experience-log/experience-log.tsx'),
        route('/sign-up', 'routes/sign-up.tsx'),
        route('/sign-in','routes/sign-in.tsx'),
        route('/sign-out', 'routes/sign-out.ts'),
        route("shop/:id/favorite", "routes/favorite.ts"),
        route('/preferences', 'routes/preferences/preferences.tsx'),


    ]),
] satisfies RouteConfig;
