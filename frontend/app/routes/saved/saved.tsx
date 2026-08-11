import {getSession} from "~/utils/session.server";
import type {Route} from './+types/saved'
import {redirect} from "react-router";
import {getFavoriteShops} from "~/utils/models/shop.model";
import {SavedShopCard} from "~/routes/saved/saved-shop-card";


export async function loader({ request }:Route.LoaderArgs){
//     grab session information from cookie jar and parse it
    const cookie = request.headers.get('Cookie')
    const session = await getSession(cookie)

//     try and grab the profile and authorization information from session
    const profile = session.get('profile')
    const authorization = session.get('authorization')
//     if profile or authorization is missing, redirect to login page
    if(!authorization || !profile){
        return redirect('/sign-in')
    }
    try{
        const shops = await getFavoriteShops(authorization, cookie)
        return {shops}
    } catch(error){
        console.error(error)
        return {shops: []}
    }

}

export default function Saved({loaderData} : Route.ComponentProps) {
    //get coffeeshops info
    const {shops} = loaderData;

    return (
        <section className="bg-amber-50">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                    Your favorites
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
                    Saved coffee shops
                </h1>

                <p className="mt-3 text-gray-600">
                    Cafés you've saved to visit or return to.
                </p>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    {shops.length === 0 ? (
                        <p className="text-gray-500">No saved cafés yet.</p>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {shops.map((shop) => <SavedShopCard shop={shop} key={shop.id} />)}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
