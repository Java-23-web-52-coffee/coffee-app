import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route('/search-page','routes/search-page.tsx')
] satisfies RouteConfig;
