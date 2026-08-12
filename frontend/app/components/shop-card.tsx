import type {Shop} from "~/utils/models/shop.model";
import type {ShopTag} from "~/utils/models/shop-tag.model";
import {ShopTagChip} from "~/components/shop-tag-chip";
import {Link} from "react-router";

// A card is a glance, not a profile: past three chips the row wraps and
// starts competing with the shop's name. The server orders tags best-average
// first, so the strongest ones survive the slice.
const MAX_CARD_TAGS = 3

// tags are optional so a caller that has not loaded them renders the card
// exactly as before, with no gap where the row would be
export function ShopCard({ shop, tags }: { shop: Shop, tags?: ShopTag[] }) {
    const visibleTags = tags?.slice(0, MAX_CARD_TAGS) ?? []

    return (
        <Link to={`/shop/${shop.id}`}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md">
                <img src={shop.imageUrl} alt={shop.name} className="h-48 w-full object-cover" />
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{shop.address}</p>

                    {visibleTags.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                            {visibleTags.map((tag) => (
                                <ShopTagChip key={tag.interestId} tag={tag} size="sm" />
                            ))}
                        </ul>
                    )}

                    <span className="mt-4 inline-block font-semibold text-amber-700">View Details</span>
                </div>
            </div>
        </Link>
    )
}
