import type {Shop} from "~/utils/models/shop.model";
import {Button, Card} from "flowbite-react";
import {Link} from "react-router";

export function SavedShopCard(props: { shop: Shop }) {
    const shop = props.shop
    return (
        <>
            <Card className="max-w-sm m-4 p-6 border-black">
                <div className={"flex justify-center"}>
                    <Button className={'bg-slate-400 text-white'} size="xs">Saved</Button>
                </div>
                <h5 className="text-2xl font-bold tracking-tight text-gray-900  text-center">
                    {shop.name}
                </h5>
                <div>
                    <img
                        src={shop.imageUrl}
                        alt="coffee shop"
                        className="h-48 w-full rounded object-cover"
                    />
                </div>
                <p className="font-normal text-center">
                    {'come back and add tags here'}
                </p>
                <Link to={`/shop/${shop.id}`}>

                    <div className="flex justify-center">
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                    </div>
                </Link>
            </Card>
        </>
    )
}