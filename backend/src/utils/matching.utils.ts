//
// Shop matching: how well one shop fits one profile's stated preferences.
//
// Pure functions only — no SQL, no Express types. The aggregation that feeds
// these lives in apis/matches/matches.model.ts, which keeps the scoring
// reasoning readable on its own and testable without a database.
//
// See documentation/matching-api-plan.md for the reasoning behind every
// constant below, and why this replaces the distance function in
// documentation/matching-algorithm.md.
//

// What an unrated interest is worth. This is the midpoint of the normalized
// scale (a raw rating of 3).
//
// "Neutral" is the wrong word for it, and an earlier version of this comment
// claimed an unknown "neither helps nor hurts the shop". It hurts, on purpose.
// Measured against the seeded Albuquerque data, the mean normalized rating
// across all rated (shop, interest) pairs is 0.735 — cafés that get written
// about are, unsurprisingly, good at the things they get written about. So
// scoring an unknown at 0.5 puts it ~23 points below what an average shop
// actually earns.
//
// That gap IS the mechanism. It is a confidence discount: the less we know
// about a shop, the harder it is for that shop to reach the top of a ranking.
// A café with one documented strength cannot leapfrog a café that is
// demonstrably good across everything the profile asked for.
//
// DO NOT "fix" this by dividing score01 by ratedWeightSum instead of
// weightSum. That was measured on real data and is worse: it scores a shop
// purely on what happens to be known about it, so the top result becomes
// whichever thinly-documented shop got a lucky rating. On the seeded data it
// puts a coverage-0.26 shop at #1 for one profile and a coverage-0.45 shop at
// #1 for another — both of which render as `limited`, i.e. a top
// recommendation carrying no verdict at all. Score spread degrades from 33-89
// to 8-92.
//
// Uncertainty is reported honestly through `coverage`, which is returned
// separately and drives the `limited` band in bandFor. That is the right place
// for it — not in the point estimate.
export const NEUTRAL_NORMALIZED = 0.5

// Below this share of weighted preference mass backed by real ratings, the
// shop gets no quality label at all — see bandFor.
export const MATCH_MIN_COVERAGE = 0.5

// Band cutoffs, expressed on the same 0-100 scale as matchScore. Each one is
// the score a shop reaches by averaging roughly 4 / 3.5 / 3 stars on the
// interests the profile weighted, so the boundaries are explainable rather
// than picked to look good. All four live here so retuning is a single edit,
// the way TAG_MIN_AVERAGE / TAG_MIN_RATERS do in apis/tags/tags.model.ts.
export const BAND_GREAT = 75
export const BAND_GOOD = 60
export const BAND_FAIR = 50

export const MATCH_QUALITIES = ['great', 'good', 'fair', 'weak', 'limited'] as const

export type MatchQuality = typeof MATCH_QUALITIES[number]

export interface ShopScore {
    // 0-1 affinity, kept unrounded because it is the sort key
    score01: number
    // share of weighted preference mass that had a real rating behind it, 0-1
    coverage: number
    ratedInterestCount: number
    preferenceCount: number
}

//
// Map a 1-5 average onto the 0-1 scale importance already lives on.
//
// Clamped because neither rating.value nor preference.importance has a CHECK
// constraint at the DB layer (see documentation/matching-api-plan.md), so a
// stray value would otherwise push matchScore outside the 0-100 the response
// schema promises.
//
// @param value a 1-5 rating average
// @returns the same value on 0-1

export function normalizeRating (value: number): number {
    const normalized = (value - 1) / 4
    return Math.min(1, Math.max(0, normalized))
}

//
// Turn a 0-1 affinity into the integer percentage the API returns. Rounding
// happens here and nowhere else, so the number and its band can never
// disagree about which side of a cutoff they fall on.

export function toMatchScore (score01: number): number {
    return Math.round(score01 * 100)
}

//
// Score one shop against one profile's preferences.
//
// importance is a WEIGHT, never a target: everyone wants a 5 on everything,
// and what differs between a "must" and a "nice" is how much falling short
// costs. So the score is a weighted average of normalized ratings, which means
// a higher rating is never worse — a café is not penalised for exceeding a
// nice-to-have.
//
// importance 0 ("no" in the preferences form) means "I don't care", so it
// drops out of the numerator and the denominator together.
//
// An UNRATED interest is different, and the difference is deliberate: it keeps
// its full share of the denominator while contributing only
// NEUTRAL_NORMALIZED to the numerator. "I don't care" removes a question from
// the exam; "nobody knows" leaves the question on the exam and scores it
// poorly. See the note on NEUTRAL_NORMALIZED for why, and for the alternative
// that was measured and rejected.
//
// @param preference interestId -> importance (0-1)
// @param shopAverages interestId -> average rating (1-5); a missing key is an
//        interest nobody has rated for this shop
// @returns the score and its supporting counts, or null when the profile has
//          no interest it actually cares about (every importance is 0, which
//          would otherwise divide by zero)

export function scoreShop (
    preference: Record<string, number>,
    shopAverages: Record<string, number>
): ShopScore | null {
    let weightSum = 0
    let weightedNormalizedSum = 0
    let ratedWeightSum = 0
    let ratedInterestCount = 0
    let preferenceCount = 0

    for (const [interestId, importance] of Object.entries(preference)) {
        if (importance <= 0) {
            continue
        }

        preferenceCount++
        weightSum += importance

        const average = shopAverages[interestId]
        if (average === undefined) {
            weightedNormalizedSum += importance * NEUTRAL_NORMALIZED
        } else {
            weightedNormalizedSum += importance * normalizeRating(average)
            ratedWeightSum += importance
            ratedInterestCount++
        }
    }

    if (weightSum === 0) {
        return null
    }

    return {
        score01: weightedNormalizedSum / weightSum,
        coverage: ratedWeightSum / weightSum,
        ratedInterestCount,
        preferenceCount
    }
}

//
// Pick the label the UI shows. The percentage itself is deliberately not
// rendered: scores cluster in the 50-75 band by construction (an unknown
// contributes 0.5, and only a straight-5 shop reaches 100), so a bare 68 reads
// like a poor grade when it is actually a strong match.
//
// Coverage is checked FIRST and on purpose. A high score assembled mostly out
// of neutral guesses is not a judgment worth asserting, so it reports as
// `limited` no matter how good the arithmetic looks.
//
// @param matchScore the rounded 0-100 score from toMatchScore
// @param coverage the weighted coverage from scoreShop
// @returns the band, which the frontend maps to copy

export function bandFor (matchScore: number, coverage: number): MatchQuality {
    if (coverage < MATCH_MIN_COVERAGE) {
        return 'limited'
    }
    if (matchScore >= BAND_GREAT) {
        return 'great'
    }
    if (matchScore >= BAND_GOOD) {
        return 'good'
    }
    if (matchScore >= BAND_FAIR) {
        return 'fair'
    }
    return 'weak'
}
