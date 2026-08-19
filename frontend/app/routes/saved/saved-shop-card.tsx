import type {Shop} from "~/utils/models/shop.model";
import {Link} from "react-router";

export function SavedShopCard(props: { shop: Shop }) {
    const shop = props.shop
    return (
        <Link to={`/shop/${shop.id}`}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md">
                <div className="relative">
                    <img src={shop.imageUrl} alt={shop.name} className="h-48 w-full object-cover" />
                    <span className="absolute right-3 top-3 rounded-full bg-mocha-100 px-3 py-1 text-sm font-semibold text-mocha-800">
                        Saved
                    </span>
                </div>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{shop.address}</p>
                    <span className="mt-4 inline-block font-semibold text-mocha-700">View Details</span>
                </div>
            </div>
        </Link>
    )
}
