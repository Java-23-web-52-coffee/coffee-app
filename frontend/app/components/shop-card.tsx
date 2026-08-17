import type {ShopWithDistance} from "~/utils/models/shop.model";
import type {ShopTag} from "~/utils/models/shop-tag.model";
import {ShopTagChip} from "~/components/shop-tag-chip";
import {Link} from "react-router";

// A card is a glance, not a profile: past three chips the row wraps and
// starts competing with the shop's name. The server orders tags best-average
// first, so the strongest ones survive the slice.
const MAX_CARD_TAGS = 3

// under ten miles a tenth tells you something ("0.3" vs "0.9" is a different
// decision); past that the decimal is noise on a number nobody walks
const DISTANCE_DECIMAL_CUTOFF_MILES = 10

/**
 * How far away, as the visitor should read it. Crow-flies, so the copy says
 * "away" and never implies a walking or driving time.
 */
function formatDistance(distanceMiles: number): string {
    const rounded = distanceMiles < DISTANCE_DECIMAL_CUTOFF_MILES
        ? distanceMiles.toFixed(1)
        : String(Math.round(distanceMiles))
    return `${rounded} mi`
}

// tags are optional so a caller that has not loaded them renders the card
// exactly as before, with no gap where the row would be
export function ShopCard({ shop, tags }: { shop: ShopWithDistance, tags?: ShopTag[] }) {
    const visibleTags = tags?.slice(0, MAX_CARD_TAGS) ?? []

    return (
        <Link to={`/shop/${shop.id}`}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md">
                <div className="relative">
                    <img src={shop.imageUrl} alt={shop.name} className="h-48 w-full object-cover" />
                    {/* only when the search was located — testing for undefined
                        rather than falsiness, because a shop 0.04 mi away
                        rounds to 0.0 and still deserves its badge */}
                    {shop.distanceMiles !== undefined && (
                        <p className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm">
                            {formatDistance(shop.distanceMiles)}
                            <span className="sr-only"> away</span>
                        </p>
                    )}
                </div>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900">{shop.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{shop.address}</p>

                    {visibleTags.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                            {visibleTags.map((tag) => (
                                <ShopTagChip key={tag.interest.id} tag={tag} size="sm" />
                            ))}
                        </ul>
                    )}

                    <span className="mt-4 inline-block font-semibold text-amber-700">View Details</span>
                </div>
            </div>
        </Link>
    )
}
