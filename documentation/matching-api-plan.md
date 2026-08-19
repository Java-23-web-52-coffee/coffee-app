# Plan: shop matching API (`GET /apis/profiles/me/matches`)

Status: **planned, not yet implemented.** Supersedes the distance function in
`documentation/matching-algorithm.md` §2–§4, which is inverted — see Context.

## Context

The app's whole premise is "BrewMatch helps you discover coffee shops based on
what matters most to you," and nothing implements it.
`/apis/profiles/me/matches` is designed in `documentation/openapi.yaml` but has
no implementation: there is no `matches` directory under `backend/src/apis/`,
and nothing in the codebase references `matchScore` or `distance`.

(The home page renders three café cards with `94% / 90% / 87% Match` badges.
Those are hardcoded placeholder JSX — not a specification, and **not a
calibration target**. See "Why the score is not shown" below.)

`documentation/matching-algorithm.md` specifies an algorithm, but its distance
function is inverted and must not be implemented as written:

```ts
sumSquares += importance * (importance - shopValue) ** 2
```

It subtracts a 0–1 `importance` from a 1–5 `rating.value`. For a must-have
(`importance = 1.0`), a café rated **5** contributes `(1−5)² = 16` while a café
rated **1** contributes `(1−1)² = 0` — and lower distance ranks higher. As
documented, the matcher ranks cafés **worst-to-best** on the interests the user
cares most about. The neutral default of 3 scores 4.0, beating every genuinely
good rating.

The fix is to stop making `importance` do two jobs. It is a **weight** (how much
a shortfall costs), never a target. Everyone wants a 5 on everything.

## Decisions

1. **A "must" weights heavily, it does not disqualify.** A café can still rank
   well by excelling elsewhere. Chosen over a hard floor because a must-have on
   an interest nobody has rated yet would empty the results page.
2. **"No" means "I don't care."** `importance` 0 drops the interest from the
   math entirely, which is current behavior — no schema or UI change.
3. **`matchScore` is a percentage, higher is better**, replacing the distance
   framing in `openapi.yaml`. The reason is that the chosen algorithm *is* an
   affinity: a weighted average of normalized ratings is naturally bounded to
   0–1, so a percentage is the value it already computes. A Euclidean distance
   has no upper bound and therefore no denominator to convert it into one,
   which would force the frontend to invent the conversion.
4. **The user never sees the percentage — they see a band label.** The score's
   job is ordering; the badge's job is reassurance. `68%` is a poor way to say
   "strong match" because it reads like a school grade. The API returns both
   `matchScore` (for ranking, and comparability over time) and `matchQuality`
   (a semantic band); the UI renders the band only.
5. **A café with thin evidence gets no quality claim.** Below a coverage
   threshold, `matchQuality` is `limited` and the UI says "Not enough ratings
   yet" instead of asserting a judgment the data cannot support.

## The algorithm

For the signed-in profile, over each interest they have a non-zero preference on:

```
normalized(avg) = (avg − 1) / 4          maps a 1–5 average onto 0–1
unknown         = 0.5                    an unrated interest sits at neutral

score01    = Σ (importance × normalized) / Σ importance
matchScore = round(score01 × 100)
```

Worked example — `wifi = must (1.0)`, `patio = nice (0.5)`:

| Café | wifi | patio | Calculation | Score |
| --- | --- | --- | --- | --- |
| A | 2 | 5 | `(1.0×0.25 + 0.5×1.00) / 1.5` | **50** |
| B | 4 | 3 | `(1.0×0.75 + 0.5×0.50) / 1.5` | **67** |

Properties that matter: a higher rating is never worse (no penalty for
exceeding a nice-to-have), a must pulls twice as hard as a nice, and
`importance` 0 falls out of numerator and denominator together.

### Why the score is not shown, and what the bands are

The scores this produces cluster low, and that is arithmetically correct rather
than a bug:

- An unrated interest contributes `0.5`, so a café with no data floors at 50.
- A genuinely good average of 4/5 normalizes to `0.75`.
- Only a café averaging a **perfect 5** on every weighted interest reaches 100.

So a 68 is a strong match. Showing that number invites the user to read it as a
grade and conclude the app found them something mediocre — hence decision 4.
**Do not calibrate against the mockup's 94%**; nothing here produces 90s.

Bands are set from the star average each one corresponds to, so the thresholds
are explainable rather than picked to look nice:

| `matchQuality` | `matchScore` | Equivalent to averaging | UI copy |
| --- | --- | --- | --- |
| `great` | ≥ 75 | ~4+ of 5 on what you care about | "Great match" |
| `good` | ≥ 60 | ~3.5 of 5 | "Good match" |
| `fair` | ≥ 50 | ~3 of 5 (neutral) | "Fair match" |
| `weak` | < 50 | below neutral | "Weak match" |
| `limited` | — | too little evidence to say | "Not enough ratings yet" |

`great` will be rare at first, because unrated interests drag every score toward
50. That is honest, and rarity is what makes the label mean anything.

**Coverage, measured by weight not by count.** `limited` wins over any quality
band when the profile's *weighted* preference mass behind real ratings falls
below `MATCH_MIN_COVERAGE` (start at `0.5`):

```
coverage = Σ importance of interests WITH a real rating
           ────────────────────────────────────────────
           Σ importance of all non-zero interests
```

Weighting the coverage matters: if your one must-have (1.0) is rated but three
nice-to-haves (0.5 each) are not, weighted coverage is `1.0 / 2.5 = 40%` while a
naive count says 25%. The must-have being covered is the thing that counts.

Expect `limited` to dominate until real visits accumulate. That is the honest
failure mode — "we don't know yet" beats a fabricated judgment — and it is one
constant to tune when data arrives.

The API returns `matchScore` regardless of band. It is the ranking key, and a
future UI (a strength meter, say) may want it. **The frontend must not render it
as a percentage** under decision 4.

### Ranking and edge cases

- Exclude any shop with **zero** real ratings on the profile's preference
  dimensions — an all-neutral vector is not a signal. This is already what
  `openapi.yaml` promises. Thin-but-nonzero coverage is included and labelled
  `limited`.
- Sort by unrounded `score01` **descending**, tie-break on `shop.name`
  ascending so the order is stable across requests.
- `Σ importance == 0` (profile marked every interest "No") → return `200` with
  an empty array. Without this guard the division is `NaN` and every
  comparison it touches is silently wrong.
- Profile has no preferences at all → `200`, empty array.
- `?limit=` is 1–25, default 5, validated with Zod like any other input.

## Reuse — the hard part is already written

`selectTagListings` in `backend/src/apis/tags/tags.model.ts` already does the
per-profile-most-recent-rating dedupe this needs, and it is the same
aggregation shape:

```sql
WITH latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id, rating.interest_id, visit.profile_id, rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
```

Copy that CTE verbatim. It gives one score per person per interest per shop, so
somebody with five visits does not outvote five people with one visit each —
the exact dedupe `matching-algorithm.md` is missing (its aggregation is a flat
`AVG` over every rating row, which lets one person vote five times in a vector
shared with every other user).

The matching query differs only in what it does next: no `HAVING` thresholds,
and it selects `AVG(latest.value)` rather than `COUNT(*)`.

## Files

**New — `backend/src/utils/matching.utils.ts`**

Pure scoring, no SQL and no Express types, so it can be reasoned about (and
later tested) in isolation — the split `matching-algorithm.md` §5 asks for:

```ts
export const NEUTRAL_NORMALIZED = 0.5
export const MATCH_MIN_COVERAGE = 0.5          // below this, quality is `limited`
export const BAND_GREAT = 75                   // all four thresholds live here so
export const BAND_GOOD  = 60                   // tuning them is a single edit,
export const BAND_FAIR  = 50                   // as TAG_MIN_AVERAGE already does

export type MatchQuality = 'great' | 'good' | 'fair' | 'weak' | 'limited'

export function normalizeRating (value: number): number   // (v − 1) / 4

export function scoreShop (
  preference: Record<string, number>,        // interestId -> importance (weight)
  shopAverages: Record<string, number>       // interestId -> avg 1–5; missing = unknown
): {
  score01: number
  coverage: number                           // weighted, 0–1
  ratedInterestCount: number
  preferenceCount: number
} | null                                     // null when Σ weight is 0

export function bandFor (score01: number, coverage: number): MatchQuality
```

`bandFor` is the only place thresholds are compared, and it checks coverage
first so `limited` cannot be overridden by a high score built on guesses.

Return a semantic enum, never display copy — the UI owns the words, the same way
`ShopTag` returns `interest.category` rather than rendered chip text.

**New — `backend/src/apis/matches/matches.model.ts`**

- `ShopMatchModel` — `ShopSchema` extended with `matchScore` (0–100 int),
  `matchQuality` (the `MatchQuality` enum), `ratedInterestCount` and
  `preferenceCount`. Import `ShopSchema` from `../shop/shop.model.ts`; do not
  redeclare it.
- `selectMatchesForProfile(profileId, limit)` — runs the `latest` CTE above
  grouped to `(shop_id, interest_id, AVG(value))`, loads the profile's
  preferences via the existing `selectPreferencesByProfileId`
  (`backend/src/apis/preferences/preference.model.ts`), calls `scoreShop` per
  shop, then sorts, slices, and parses.
- Both `preference.importance` and `AVG(value)` are `decimal`, which the driver
  returns as **strings** — coerce with `z.coerce.number` exactly as
  `RatingRowModel` and `PreferenceModel` already do.

**New — `backend/src/apis/matches/matches.controller.ts`**

`getMyMatchesController`: read `profile` off the session (401 if absent),
Zod-validate `limit` from the query, call the model, return the array directly
per `CLAUDE.md` — no `{ status, message, data }` wrapper. `sendServerError` in
the catch.

**New — `backend/src/apis/matches/matches.route.ts`**

`basePath = '/apis/profiles/me/matches'`, `router.route('/').get(...)`,
following `backend/src/apis/preferences/preference.route.ts`.

Guard with `isLoggedInController`. Note the friction: `openapi.yaml` lists only
`sessionCookie` for this endpoint and `CLAUDE.md` says safe reads need no CSRF,
but every comparable authenticated GET in the codebase (preferences, ratings)
uses `isLoggedInController`, and the frontend models all send the
`Authorization` header on those reads. Follow the working convention and correct
the spec's `security` block to match.

**Edit — `backend/src/App.ts`**

Import and register alongside the other `/apis/profiles/me/*` routes.

**Edit — `documentation/openapi.yaml`**

- `ShopMatch.matchScore` becomes an integer percentage, `minimum: 0,
  maximum: 100`, described as higher-is-better — replacing "Weighted Euclidean
  distance. Lower is a closer match."
- Add `matchQuality` as an `enum` of the five band values, `ratedInterestCount`,
  and `preferenceCount`.
- Document that clients are expected to render `matchQuality`, not
  `matchScore` — otherwise the next reader wires the raw number to a badge.
- The `200` description changes from "ascending matchScore (closer = better)"
  to descending.
- Add `sessionCookie` + `csrfToken` to match the guard actually used.

**Edit — `documentation/matching-algorithm.md`**

Not optional. It currently documents the inverted distance function and a
non-deduping aggregation; leaving it in place means the next person implements
the bug. Replace §2–§4 with the formula above, keep §1's input description,
and note that the dedupe comes from the tags CTE.

## Verification

No unit test framework exists (`backend/package.json`'s `test` script is a
stub), so verification is by hand.

**1. Scoring math, before any DB work.** Run `scoreShop` against the worked
example above with a throwaway script and confirm 50 / 67. Then check the
guards: all-weights-zero returns `null`, an unknown interest contributes 0.5,
and raising any rating never lowers the score.

Then `bandFor` at each boundary — `74 → good`, `75 → great`, `59 → fair`,
`60 → good`, `49 → weak`, `50 → fair` — plus the precedence rule: a score of 90
with coverage `0.3` must return `limited`, not `great`. That last one is the
whole point of the band and the easiest to get wrong by checking thresholds
before coverage.

**2. Seed the data.** `sql/seed-tags.sql` builds visits and ratings across 3
shops × 3 interests with documented averages (Shop 1 / interest 1 → 4.67, Shop 1
/ interest 2 → 2.67, Shop 1 / interest 3 → 4.33) and is safe to run twice — every
insert is `ON CONFLICT DO NOTHING`. It also proves the dedupe: Ana rated
interest 1 as `1` on an old visit and `5` on a newer one, and only the `5`
should count.

**3. Set preferences and check the ranking by hand.** Sign in, save "must" on
interest 1 and "nice" on interest 2, then:

```bash
curl -i -b cookies.txt -H "Authorization: $JWT" \
  'http://localhost:8080/apis/profiles/me/matches?limit=5'
```

Shop 1's expected score is derivable by hand from the seeded averages, so this
is a real assertion rather than a smell test:

```
interest 1  must (w 1.0)  avg 4.67  ->  (4.67−1)/4 = 0.9175
interest 2  nice (w 0.5)  avg 2.67  ->  (2.67−1)/4 = 0.4175

score01 = (1.0 × 0.9175 + 0.5 × 0.4175) / 1.5 = 0.7508
matchScore = 75
```

If Shop 1 comes back as 75, the weighting, the normalization, and the dedupe are
all behaving. If it comes back near 92, the nice-to-have is being dropped; near
67, the weights are being applied evenly.

Both preferred interests are rated on Shop 1, so `coverage` is `1.0` and
`matchQuality` should be **`great`** — 75 sits exactly on the boundary, which
also confirms the comparison is inclusive rather than strict.

**3b. The `limited` band.** Add a preference on a fourth interest that
`seed-tags.sql` never rates. That drops weighted coverage below `0.5` for the
seeded shops, and every result should flip to `matchQuality: "limited"` while
`matchScore` keeps its numeric value. This is the state the app will actually be
in until visit logging ships, so it is worth seeing on purpose rather than
discovering in front of users.

**4. The edge cases, each of which should be `200` with `[]` — never a 500:**

- a profile with no preferences saved
- a profile with every interest marked "No" (this is the `NaN` guard)
- `?limit=0` and `?limit=99` should be `400`, not silently clamped

**5. Confirm the dedupe holds.** Add a second recent visit for one seeded rater
with a wildly different score, and confirm the shop's ranking moves by *one
person's* worth, not by an extra vote.

Docker is required from step 2 onward (`docker compose up --build`, backend on
`localhost:8080`). Note that `project.env` points at a **remote shared
database** — seeding and test preferences write to real team data, so use a
throwaway account.

## Deliberately out of scope

- **Wiring the home page.** `frontend/app/routes/home.tsx` has three hardcoded
  match cards. This plan delivers the API only; the frontend model, loader, and
  badge component are a follow-on. When that happens, the badge renders
  `matchQuality` and the caption uses `ratedInterestCount` /
  `preferenceCount` ("based on 2 of your 6 preferences") — the raw
  `matchScore` stays out of the DOM.
- **Tuning the band and coverage thresholds against real data.** The four
  constants are seeded from the star averages they represent, not from an
  observed distribution, because no distribution exists yet. They live together
  in `matching.utils.ts` so retuning is one edit once visits accumulate.
- **"No" as active avoidance.** Recorded as an open question: weight 0 cannot
  express "steer away from this," so if users read "No" as a deal-breaker their
  strongest signal is being discarded. Needs a UX answer before a schema one.
- **`CHECK` constraints on `rating.value` / `preference.importance`.** Still
  bare `decimal`; a value outside 1–5 would produce a `matchScore` outside
  0–100. Application-level Zod is the only guard.

## Known dependency

The matcher averages `rating` rows, and those only come from the experience-log
flow — which is not wired up in the current tree (`/experience-log/:visitId` has
no entry point anywhere in the frontend, and `visit.model.ts` exports only
`getVisitById`, no `postVisit`). This API can be built and verified against
`seed-tags.sql`, but real rankings stay meaningless until visit logging ships.