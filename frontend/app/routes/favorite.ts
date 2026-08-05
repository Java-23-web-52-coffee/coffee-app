import {redirect} from "react-router";
import {getSession} from "~/utils/session.server";
import {deleteFavorite, postFavorite} from "~/utils/models/favorite.model";
import type {Route} from './+types/favorite'

export async function action({request, params}: Route.ActionArgs) {
    const cookie = request.headers.get("Cookie");
    const session = await getSession(cookie);

    const profile = session.get("profile");
    const authorization = session.get("authorization");

    if (!profile || !authorization) {
        return redirect("/sign-in");
    }
const shopId = params.id;
    try {
        const status = await postFavorite(shopId, profile.id, authorization, cookie);
console.log(status);
        if (status === 409) {
            await deleteFavorite(shopId, profile.id, authorization, cookie);
            return {favorite: false};
        }
        return {favorite: status === 201};
    } catch (error) {
        console.error(`failed to toggle favorite: ${params.id}`, error);
        return {favorite: false};
    }


}