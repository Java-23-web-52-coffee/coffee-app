import { Link } from "react-router";
import type { ShopMatch } from "~/utils/models/match.model";
import { MatchBadge } from "~/components/match-badge";

/**
 * MatchCard Component
 *
 * One matched café: its image, name, the quality badge, and how much evidence
 * the match rests on.
 *
 * The coverage line is always shown, not just when evidence is thin. A match
 * built on 2 of your 6 preferences is a weaker claim than one built on 6 of 6
 * even when both land in the same band, and hiding that difference would make
 * the badge look more certain than it is.
 *
 * @param match - a shop plus its match fields
 */

type MatchCardProps = {
    match: ShopMatch
}

export function MatchCard({ match }: MatchCardProps) {
    // shop.id is nullable on the schema; without one there is no detail page to
    // link to, so the card renders as static content instead of a dead link
    const detailPath = match.id === null ? null : `/shop/${match.id}`

    return (
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <img
                src={match.imageUrl}
                alt={match.name}
                className="h-48 w-full bg-gray-200 object-cover"
            />

            <div className="p-6">
                <div className="mb-3 flex items-start justify-between gap-4">
                    <h3 className="text-xl font-bold text-gray-900">
                        {match.name}
                    </h3>

                    <MatchBadge quality={match.matchQuality} />
                </div>

                <p className="text-gray-600">{match.address}</p>

                <p className="mt-3 text-sm text-gray-500">
                    Based on {match.ratedInterestCount} of your{' '}
                    {match.preferenceCount}{' '}
                    {match.preferenceCount === 1 ? 'preference' : 'preferences'}
                </p>

                {detailPath !== null && (
                    <Link
                        to={detailPath}
                        className="mt-5 inline-block font-semibold text-mocha-700 hover:text-mocha-900"
                    >
                        View Details
                    </Link>
                )}
            </div>
        </article>
    )
}
