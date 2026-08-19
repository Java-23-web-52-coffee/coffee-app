# Shop Matching Algorithm (`GET /apis/profiles/me/matches`)

Finds the k shops whose character best matches a profile's stated preferences.
No ML, no external library, no vector DB — SQL aggregation plus a pure
TypeScript scoring function.

Implemented in `backend/src/utils/matching.utils.ts` (scoring) and
`backend/src/apis/matches/matches.model.ts` (aggregation).
`documentation/matching-api-plan.md` records why each decision was made.

> **Revised.** An earlier version of this document specified a weighted
> Euclidean *distance* that subtracted a 0–1 `importance` from a 1–5
> `rating.value`. That formula ranked shops **worst-to-best** on the interests
> a user cared most about: for a must-have, a shop rated 5 scored `(1−5)² = 16`
> while a shop rated 1 scored `(1−1)² = 0`, and lower distance ranked higher.
> It also aggregated with a flat `AVG` over every rating row, letting one
> person vote as many times as they logged visits. Both are corrected below.

## 1. Inputs

**User preference vector `P`** — one row per interest the profile has opted
into:

```sql
SELECT interest_id, importance
FROM preference
WHERE profile_id = :profileId
```

`importance` is a **weight**, not a target. Everyone wants a 5 on everything;
what differs between a "must" and a "nice" is how much falling short costs.
Interests weighted `0` ("no" in the preferences form) mean *"I don't care"* and
drop out of the calculation entirely — numerator and denominator together.

**Shop vector `S`** — for each shop, the average rating it has received on
those same interests, across *every* profile's visits, with **one vote per
person per interest**:

```sql
WITH latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id, rating.interest_id, visit.profile_id, rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    WHERE rating.interest_id = ANY(:interestIds)
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
SELECT shop_id, interest_id, AVG(value) AS average
FROM latest
GROUP BY shop_id, interest_id
```

The `DISTINCT ON` collapsing is the same one `selectTagListings` uses in
`apis/tags/tags.model.ts`, and it matters for the same reasons: somebody who
visits five times must not outvote five people who visited once, and the
`visit.id` tiebreak keeps the surviving row deterministic when two visits share
a `created_at`. Because it reads only rows that *have* a rating for the
interest, a rater whose newest visit skipped an interest still contributes
their earlier score for it.

**Why aggregate across all profiles, not just the requester's own visits:** the
app's purpose is surfacing shops the user *hasn't* been to. A vector built only
from their own ratings would leave every unvisited shop unrecommendable, which
defeats the point. The tradeoff is ordinary recommender cold-start, not an
architecture flaw.

## 2. Scoring

A weighted average of normalized ratings — an **affinity** on 0–1, not a
distance:

```
normalized(avg) = (avg − 1) / 4        maps a 1–5 average onto 0–1
unknown         = 0.5                  an unrated interest sits at neutral

score01    = Σ (importance × normalized) / Σ importance
matchScore = round(score01 × 100)
```

```ts
// utils/matching.utils.ts
export function scoreShop (
  preference: Record<string, number>,   // interestId -> importance (weight)
  shopAverages: Record<string, number>  // interestId -> avg 1–5; missing = unknown
): ShopScore | null                     // null when every importance is 0
```

Worked example — `wifi = must (1.0)`, `patio = nice (0.5)`:

| Shop | wifi | patio | Calculation | `matchScore` |
| --- | --- | --- | --- | --- |
| A | 2 | 5 | `(1.0×0.25 + 0.5×1.00) / 1.5` | **50** |
| B | 4 | 3 | `(1.0×0.75 + 0.5×0.50) / 1.5` | **67** |

The properties this buys, none of which the old distance function had:

- **A higher rating is never worse.** A shop is not punished for exceeding a
  nice-to-have. (A target-matching model would rank a mediocre patio above a
  superb one for someone who marked patios "nice" — only correct for two-sided
  attributes, and the `interest` taxonomy marks none.)
- **A must pulls twice as hard as a nice**, via the weight alone.
- **`importance` 0 costs nothing**, in either direction.

`normalizeRating` clamps to 0–1 because neither `rating.value` nor
`preference.importance` has a `CHECK` constraint at the DB layer — both columns
are bare `decimal` in `sql/project.sql`. Application-level Zod is the only real
guard; the clamp keeps a stray row from pushing `matchScore` outside the 0–100
the response schema promises.

## 3. Bands — what the user actually sees

`matchScore` is the ranking key and is **not displayed**. Scores cluster in the
50–75 range by construction: an unrated interest contributes 0.5, a genuinely
good 4/5 average normalizes to 0.75, and only a straight-5 shop reaches 100. A
bare `68` therefore reads like a poor grade when it is a strong match.

The API returns a band alongside it, and the UI renders that:

| `matchQuality` | `matchScore` | Equivalent to averaging | UI copy |
| --- | --- | --- | --- |
| `great` | ≥ 75 | ~4+ of 5 on what you care about | "Great match" |
| `good` | ≥ 60 | ~3.5 of 5 | "Good match" |
| `fair` | ≥ 50 | ~3 of 5 (neutral) | "Fair match" |
| `weak` | < 50 | below neutral | "Weak match" |
| `limited` | — | too little evidence to say | "Not enough ratings yet" |

Cutoffs are derived from the star average each represents, so they are
explainable rather than tuned to look good. They live as constants beside the
scoring function (`BAND_GREAT`, `BAND_GOOD`, `BAND_FAIR`,
`MATCH_MIN_COVERAGE`) so retuning is a single edit — the pattern
`TAG_MIN_AVERAGE` / `TAG_MIN_RATERS` already set.

**Coverage, weighted rather than counted.** `limited` overrides every quality
band when the profile's weighted preference mass backed by real ratings falls
below `MATCH_MIN_COVERAGE`:

```
coverage = Σ importance of interests WITH a real rating
           ────────────────────────────────────────────
           Σ importance of all non-zero interests
```

If the one must-have (1.0) is rated but three nice-to-haves (0.5 each) are not,
weighted coverage is `1.0 / 2.5 = 40%` where a naive count would say 25% — the
must-have being covered is the part that counts. `bandFor` checks coverage
*before* the thresholds, so a high score assembled out of neutral defaults can
never present itself as a quality claim.

Expect `limited` to dominate until real visit volume accumulates. That is the
honest failure mode: "we don't know yet" beats a fabricated judgment.

## 4. Ranking and edge cases

1. Consider only shops with at least one real rating on an interest the profile
   weighted — a shop scored entirely on neutral defaults carries no signal.
   This falls out of the aggregation for free: such a shop produces no rows.
2. Sort by **descending** `score01` (unrounded, so shops that round to the same
   percentage still order deterministically); break ties on `shop.name`.
3. Take the first `k` (`?limit=`, default 5, bounded 1–25, Zod-validated —
   out of range is a `400`, not a silent clamp).
4. **Profile has no preferences yet** → `200` with an empty array. The frontend
   prompts for preferences rather than the API refusing the request.
5. **Every interest weighted 0** → `200`, empty array. Without this guard
   `Σ importance` is 0, the division yields `NaN`, and every comparison it
   touches is silently wrong.
6. **No shop matches at all** → `200`, empty array, same reasoning as 4.

## 5. Where this lives

Following the existing route → controller → model → sql layering:

- `utils/matching.utils.ts` — `normalizeRating`, `toMatchScore`, `scoreShop`,
  `bandFor`, and the tuning constants. No SQL, no Express types.
- `apis/matches/matches.model.ts` — the aggregation above,
  `selectMatchesForProfile(profileId, limit)`, and `ShopMatchModel` (which
  extends `ShopSchema` rather than redeclaring it).
- `apis/matches/matches.controller.ts` — guarded by `isLoggedInController`
  (personalised to the session profile), returns the resource array directly,
  no wrapper.

## 6. Response shape

Shop data plus the match signal, so it is its own schema rather than reusing
`Shop` verbatim — still resource-direct, just a wider resource:

```yaml
ShopMatch:
  allOf:
    - $ref: '#/components/schemas/Shop'
    - type: object
      properties:
        matchScore:         { type: integer, minimum: 0, maximum: 100 }
        matchQuality:       { type: string, enum: [great, good, fair, weak, limited] }
        ratedInterestCount: { type: integer, minimum: 0 }
        preferenceCount:    { type: integer, minimum: 1 }
```

`ratedInterestCount` and `preferenceCount` let the client qualify a score
("based on 2 of your 6 preferences") instead of presenting it as authoritative.

## 7. Open

- **"No" as active avoidance.** `importance` 0 currently means "irrelevant". A
  user who marks "loud music: No" meaning *"I hate loud music"* has their
  strongest signal discarded, because weight 0 cannot express a negative
  target. Needs a UX answer (what does the button mean?) before a schema one.
- **A minimum-evidence threshold beyond coverage.** `MATCH_MIN_COVERAGE` is set
  from first principles, not from an observed score distribution, because no
  distribution exists yet. Retune once visits accumulate.
