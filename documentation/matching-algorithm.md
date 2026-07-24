# Shop Matching Algorithm (`GET /apis/profiles/me/matches`)

Finds the k shops whose character most closely matches a profile's stated
preferences. This is nearest-neighbor *search* over two small numeric
vectors — no ML training, no external library, no vector DB. Plain SQL
aggregation + a pure TypeScript distance function.

## 1. Inputs

**User preference vector `P`** — one row per interest the profile has
opted into:

```
SELECT interest_id, importance
FROM preference
WHERE profile_id = :profileId
```

`P[interestId] = importance`. Only interests the profile has an opinion on
define the dimensions we compare on — we never compare against interests
the user hasn't weighed in on.

**Shop vector `S`** — for each shop, the average rating it has received on
those same interests, aggregated across *every* profile's visits (not just
the requesting user's — see rationale below):

```sql
SELECT visit.shop_id, rating.interest_id, AVG(rating.value) AS avg_value
FROM rating
JOIN visit ON visit.id = rating.visit_id
WHERE rating.interest_id = ANY(:interestIds)  -- the profile's preference dimensions
GROUP BY visit.shop_id, rating.interest_id
```

`S[shopId][interestId] = avg_value`.

**Why aggregate across all profiles, not just the requester's own visits:**
the app's purpose is surfacing shops the user *hasn't* been to yet. If a
shop's vector were built only from the requester's own ratings, an
unvisited shop would have no vector and could never be recommended — which
defeats the point. The tradeoff is a normal recommender cold-start problem
(new shops/interests have thin data), not an architecture flaw.

## 2. Handling missing dimensions

A shop may have no rating at all for one of the profile's preferred
interests (nobody's rated it yet, or it opened last week). Rather than
dropping the shop, substitute a **neutral default** at the midpoint of the
rating scale so an unrated interest neither helps nor hurts the match:

- Recommend a **1–5 decimal scale** for both `rating.value` and
  `preference.importance` (simple to render as stars/sliders in the
  frontend, human-readable, easy to validate). Neutral default = `3`.
- This isn't currently enforced anywhere — `sql/project.sql` declares both
  columns as bare `decimal` with no `CHECK`, and there's no Zod schema for
  either table yet. Before implementing, add `CHECK (value BETWEEN 1 AND
  5)` / `CHECK (importance BETWEEN 1 AND 5)` (and matching Zod `.min(1)
  .max(5)`) so the distance function's assumptions actually hold at the
  DB layer, not just in application code.

## 3. Distance function

Weighted Euclidean distance, where each interest's `importance` doubles as
its weight — the more a profile cares about an interest, the more that
interest's mismatch counts against the shop:

```
d(P, S_shop) = sqrt( Σ importance_i * (P_i - S_shop_i)² )   for i in P's interest ids
```

Lower `d` = better match. This is preferred over cosine similarity here
because cosine only measures directional alignment and *ignores
magnitude* — but `importance` already encodes magnitude (how much the user
cares), so squashing that into a unit vector would throw away the signal
we most want to use.

```ts
// utils/matching.utils.ts
export function distance(
  preference: Record<string, number>,   // interestId -> importance
  shop: Record<string, number>,          // interestId -> avg rating (missing = neutral default)
  neutral = 3
): number {
  let sumSquares = 0
  for (const [interestId, importance] of Object.entries(preference)) {
    const shopValue = shop[interestId] ?? neutral
    sumSquares += importance * (importance - shopValue) ** 2
  }
  return Math.sqrt(sumSquares)
}
```

Pure function, no DB access — trivially unit-testable with hand-built
vectors, independent of the SQL aggregation step.

## 4. Ranking and edge cases

1. Compute `d(P, S_shop)` for every shop that has at least one rating
   overlapping the profile's preference dimensions (shops with zero
   overlapping ratings are excluded rather than scored entirely on
   neutral defaults — an all-neutral vector is not a real signal).
2. Sort ascending by distance; break ties by `shop.name` for a
   deterministic, paginatable order.
3. Take the first `k` (query param `?limit=`, default e.g. 5, bounded
   1–25 — validate with Zod like any other query input).
4. **Profile has no preferences yet** → return `200` with an empty array;
   don't error. The frontend prompts the user to set preferences rather
   than the API refusing the request.
5. **No shops match at all** (sparse data) → `200` with an empty array,
   same reasoning.

## 5. Where this lives in the codebase

Following the existing route → controller → model → sql layering:

- `sql`: the aggregation query above, plus the two `CHECK` constraints.
- `utils/matching.utils.ts`: the pure `distance()` function — no SQL, no
  Express types, easy to test in isolation.
- `apis/profile/profile.model.ts` (or a new `match.model.ts`): a
  `selectMatchedShopsForProfile(profileId, limit)` function that runs the
  preference query + shop aggregation query, then calls `distance()` per
  shop and returns the sorted, sliced result.
- `apis/profile/matches.controller.ts`: guarded by `isLoggedInController`
  (personalized to the session's profile), calls the model, returns the
  resource array directly — no wrapper.

## 6. Response shape

The response is shop data plus a match signal, so it's its own schema
rather than reusing `Shop` verbatim — still resource-direct, just a wider
resource:

```yaml
ShopMatch:
  allOf:
    - $ref: '#/components/schemas/Shop'
    - type: object
      properties:
        matchScore:
          type: number
          description: Weighted Euclidean distance to the profile's preference vector. Lower is a closer match.
```
