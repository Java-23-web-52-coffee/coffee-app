import {Button, Card} from "flowbite-react";
import type {Shop} from "~/utils/models/shop.model";
import {Link} from "react-router";

export function ShopCard({ shop }: { shop:Shop }){
    console.log(shop)
    return (
        <Card className="max-w-sm m-4 p-6 border-black">
            <div className={"flex justify-end"}>
                <Button className={'bg-slate-300 text-black'} size="xs">Save</Button>
            </div>
            <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                {shop.name}
            </h5>
            <h2>{shop.name}</h2>
            <div>
                <img src={ shop.imageUrl } alt={ shop.name }/>
            </div>
            <p className="font-normal text-center">
                Coffeeshop tags/categories
            </p>
            <Link to={`/shop/${shop.id}`} className={"bg-slate-300 text-black"}>
                View Details
                <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                     xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </Link>
        </Card>
    )
}