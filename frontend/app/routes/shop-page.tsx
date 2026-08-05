import {Button} from "flowbite-react";
import {getAllShops, getFavoriteShops, getShopById, type Shop} from "~/utils/models/shop.model";
import type {Route} from "../../.react-router/types/app/routes/+types/shop-page";
import {getSession} from "~/utils/session.server";
import {redirect, useFetcher} from "react-router";
import {type Favorite, getFavorite} from "~/utils/models/favorite.model";

//Our first step is going to be checking to see if the user has liked this coffeeshop
//Step 1: Get logged in user profile id
//Step 2: If user is logged in, get favorite by primary key
//Step 2.1: Create a favorite.model.ts file
//Step 3: If favorite exists, set button to "Unsave" and if not, set button to "Save"


export async function loader({params, request}: Route.LoaderArgs) {
    console.log(params)


    //     grab session information from cookie jar and parse it
    const cookie = request.headers.get('Cookie')
    const session = await getSession(cookie)

    const profile = session.get('profile')
    const authorization = session.get('authorization')
    if (!authorization || !profile) {
        return redirect('/sign-in')
    }
    const shop: Shop = await getShopById(params.id)
    const favorite = await getFavorite (params.id, profile.id)
    return {shop, favorite}
}


export default function ShopPage({loaderData}: Route.ComponentProps) {
    const {shop, favorite} = loaderData
    const fetcher = useFetcher<{ favorite: boolean }>();
    const liked = fetcher.data?.favorite ?? false;

    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        console.log('I made it here')
        fetcher.submit(null, { method: "post", action: `/shop/${shop.id}/favorite` }).catch((error) => {
            console.error(`Failed to toggle favorite for shop ${shop.id}:`, error);
        });
    };

    const buttonText = favorite ? 'unfavorite' : 'favorite'
    return (
        <>
            <h1 className={"text-center m-4 text-5xl"}>Coffeeshop main page</h1>

            <div className={'bg-slate-300 p-7 mt-20 flex flex-col md:flex-row lg:flex-col items-center gap-4'}>
                <img src={shop.imageUrl} alt="coffee shop" className={'w-64 h-64 object-cover rounded-md border shadow-md mx-auto shrink-0'}/>
                <div className={'bg-white p-6 sm:p-10 m-7 rounded-md shadow-md flex-1'}>
                    <div
                        className={'w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-2'}>
                        <ul className={'text-sm md:text-base lg:text-lg'}>
                            <li>{shop.name}</li>
                            <li>{shop.address}</li>
                            {/*<li>{shop.hours}</li>*/}
                        </ul>
                        <button onClick={toggleFavorite} className={'bg-slate-300 px-4 py-2 rounded-md hover:bg-slate-400'}>
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}