
import {type RouteConfig, index, layout, route} from "@react-router/dev/routes";


export default [
    layout('./layouts/nav/navbar.tsx', [
        index("routes/home.tsx"),
        route('/search-page','routes/search-page.tsx'),
        route('/shop/:id','routes/shop-page.tsx'),
        route('/saved-coffeeshops','routes/saved-coffeeshops.tsx'),
        route('/experience-log','routes/experience-log.tsx')


    ])
] satisfies RouteConfig;
