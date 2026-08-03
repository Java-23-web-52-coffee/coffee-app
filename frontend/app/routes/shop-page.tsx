import {Button} from "flowbite-react";
import type {Route} from "../../.react-router/types/app/routes/+types/search-page";
import {getAllShops, getShopById, type Shop} from "~/utils/models/shop.model";

export async function loader({ params }: Route.LoaderArgs) {
console.log(params)
    const shop: Shop = await getShopById(params.id)
    return{shop}
}




export default function ShopPage({ loaderData }: Route.ComponentProps) {
const {shop} = loaderData
    console.log(shop)

        return (
            <>
                <h1 className={"text-center m-4 text-5xl"}>Coffeeshop main page</h1>

                <div className={'bg-slate-300 p-7 mt-20 flex flex-col md:flex-row items-center gap-4'}>
                    <img src={shop.imageUrl} alt="coffee shop" className={'w-full md:w-auto'}/>
                    <div className={'bg-white p-6 sm:p-10 m-7 rounded-md shadow-md flex-1'}>
                        <div className={'w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-2'}>
                            <ul className= {'text-sm md:text-base lg:text-lg'}>
                                <li>{shop.name}</li>
                                <li>{shop.address}</li>
                                {/*<li>{shop.hours}</li>*/}
                            </ul>
                            <button className={'bg-slate-300 px-4 py-2 rounded-md hover:bg-slate-400'}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }