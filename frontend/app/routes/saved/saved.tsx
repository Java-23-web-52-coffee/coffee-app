import {Button, Card} from "flowbite-react";
import {getSession} from "~/utils/session.server";
import type {Route} from './+types/saved'
import {redirect} from "react-router";
import {getFavoriteShops, getFavoriteShopsByProfileId} from "~/utils/models/shop.model";
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
    console.log(shops)

    const dummyShops = [
        {name: 'little bear', image: '/littlebear.png', tags: ['good lattes', 'close']},
        {name: 'whispering bean', image: '/whisperbean.jpg', tags: ['nice people','good breakfast burritos']},
        {name: "Jazzmine's drip", image: '/jazzmineshop.jpg', tags: ['kid friendly','convenient']},
        {name: 'little bear', image: '/littlebear.png', tags: ['good lattes', 'close']},
        {name: 'whispering bean', image: '/whisperbean.jpg', tags: ['nice people','good breakfast burritos']},
        {name: "Jazzmine's drip", image: '/jazzmineshop.jpg', tags: ['kid friendly','convenient']},
    ]

    return (
        <>
            <h1 className={"text-center m-4 text-5xl"}>Saved</h1>
            {/*//Coffee shop card*/}
            <div className={"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"}>
                {shops.map((shop, index) =><SavedShopCard shop={shop} key={shop.id} />)}



            </div>
        </>
    )
}
