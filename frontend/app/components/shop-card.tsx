import type {Shop} from "~/utils/models/shop.model";
import {Link} from "react-router";

export function ShopCard({ shop }: { shop: Shop }) {
    return (
        <Link to={`/shop/${shop.id}`}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md">
                <img src={shop.imageUrl} alt={shop.name} className="h-48 w-full object-cover" />
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{shop.address}</p>
                    <span className="mt-4 inline-block font-semibold text-amber-700">View Details</span>
                </div>
            </div>
        </Link>
    )
}
