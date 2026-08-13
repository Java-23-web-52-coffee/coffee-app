import type { MatchQuality } from "~/utils/models/match.model";

/**
 * MatchBadge Component
 *
 * Renders how well a café fits the signed-in profile — as a label, never as a
 * percentage.
 *
 * The API returns a 0-100 `matchScore`, and it is deliberately not shown here.
 * Scores cluster in the 50-75 band by construction: an unrated interest counts
 * as neutral, and only a café averaging a straight 5 on every weighted interest
 * reaches 100. So a genuinely strong match scores 68, which reads like a poor
 * grade if you put the digits on screen. The band carries the meaning instead.
 *
 * `limited` is not a quality rating — it is the absence of one. A café with
 * ratings on too little of what you care about gets no judgment, because
 * "Fair match" would assert something the data cannot support.
 *
 * See documentation/matching-api-plan.md.
 *
 * @param quality - the band from the API
 */

const QUALITY_COPY: Record<MatchQuality, string> = {
    great: 'Great match',
    good: 'Good match',
    fair: 'Fair match',
    weak: 'Weak match',
    limited: 'Not enough ratings yet'
}

// `limited` is visually muted and dashed so it reads as "no verdict" rather
// than as the bottom of the scale — it is a different kind of answer from
// "weak", which IS a verdict.
const QUALITY_CLASSES: Record<MatchQuality, string> = {
    great: 'border-amber-600 bg-amber-100 text-amber-900',
    good: 'border-amber-300 bg-amber-50 text-amber-800',
    fair: 'border-gray-300 bg-gray-50 text-gray-700',
    weak: 'border-gray-200 bg-white text-gray-500',
    limited: 'border-dashed border-gray-300 bg-white text-gray-500'
}

type MatchBadgeProps = {
    quality: MatchQuality
}

export function MatchBadge({ quality }: MatchBadgeProps) {
    return (
        <span
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${QUALITY_CLASSES[quality]}`}
        >
            {QUALITY_COPY[quality]}
        </span>
    )
}
