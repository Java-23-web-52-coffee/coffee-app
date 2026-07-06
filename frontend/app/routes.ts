
import {type RouteConfig, index, layout, route} from "@react-router/dev/routes";


export default [
    layout('./layouts/nav/navbar.tsx', [
        index("routes/home.tsx"),
        route('/search-page','routes/search-page.tsx'),
        route('/coffeeshop-main-page','routes/coffeeshop-main-page.tsx'),
        route('/saved-coffeeshops','routes/saved-coffeeshops.tsx')


    ])
] satisfies RouteConfig;
