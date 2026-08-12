# Plan: log an experience

Status: **implemented.** This plan records the design as settled in a
design review of the `dynamic/log-an-experience` branch; every numbered
decision below was made deliberately, including the ones that trade
correctness for scope.

## Context

The branch arrived with a working `/experience-log/:visitId` page — a loader
that fetched a visit, checked ownership, and rendered a 1–5 radiogroup per
interest — and no way to reach it. Nothing in the frontend linked to the
route, and `visit.model.ts` exported only `getVisitById`; there was no
`postVisit` anywhere. The only way to open the feature was to hand-type a
UUID into the address bar.

That absence turned out to be the important part. Deciding *how* a visit
comes into existence changed the shape of the whole feature, so the review
worked outward from it.

## 1. The visit is created on submit, not on load

A café visit leaves no trace the app can observe — no check-in, no
geolocation, no receipt. The only evidence a visit happened is that the user
pressed a button. So the button *is* the visit.

Two ways to spend that press:

- **Create the visit on press, then navigate to `/experience-log/:visitId`.**
  Gives the rating form a real visit to hang ratings off, at the cost of a
  visit row for every user who opens the form and wanders off.
- **Navigate to `/experience-log/:shopId` and create the visit at submit.**
  No orphan rows, and the URL identifies the café — which is what the user
  thinks they're looking at.

**Decided: the second.** The route param is `:shopId`, and the visit is born
at submit time alongside its ratings.

## 2. A logged experience cannot be edited

This follows from decision 1 and is worth stating plainly because it
deletes two mechanisms the branch already had.

If no visit exists at page load, there are no saved ratings to prefill, so
the loader's `getRatings` call has nothing to fetch. And if every submit
mints a fresh visit id, then no `(visitId, interestId)` pair can already
exist, so `POST /apis/visits/:visitId/ratings` can never return 409 — which
makes the 409→PUT retry in `rating.model.ts` unreachable.

**Decided: give up editing.** Once submitted, a visit's ratings are frozen.
Changing your mind about a café means logging another visit. The prefill and
the upsert retry are both dead under this design.

## 3. One transactional endpoint

Under the original per-rating write path, one press of Submit meant `POST`
the visit, wait for its id, then fire N separate rating POSTs — seven HTTP
calls for six interests, with no transaction. Every intermediate failure
left a state the UI could not describe: a visit with zero ratings, or a
half-logged experience reported to the user as a failure while four rows sat
committed. There was no `DELETE` on visit to unwind with.

**Decided: one endpoint, one transaction.**

```
POST /apis/profiles/me/visits
{ "shopId": "...", "ratings": [ { "interestId": "...", "value": 4 } ] }
```

The visit row and all its rating rows are inserted inside a single
`sql.begin` block. Either the whole experience is logged or none of it is.

The ownership-check pattern in `ratings.controller.ts` — verify the visit
belongs to `request.session.profile`, else 403 — is the model to follow for
anything that touches a visit. Those three controllers are the
best-constructed part of the branch.

## 4. Rating breadth: preferred by default, all by opt-in

The form originally filtered the global interest list down to interests the
rater has a preference on:

```ts
const preferredInterestIds = new Set(preferences.map((p) => p.interestId));
```

That collides with the shared shop vector. `matching-algorithm.md` builds
each shop's vector by averaging ratings across *every* profile, explicitly so
unvisited cafés are recommendable. But if raters only ever rate what they
personally care about, a café's coverage on "quiet workspace" depends on
whether the people who walked in happened to care about quiet workspaces.
Rare-but-strongly-held interests get the thinnest data, and the neutral
fallback fires hardest exactly where users have the strongest opinions.

**Decided: keep the short form as the default, add an opt-in toggle to rate
every interest.** Blanks stay the common case; users who want to feed the
dataset can.

## 5. Submit requires at least one rating

The original gate required every visible row:

```ts
const allRated = items.length > 0 && items.every((item) => ratings[item.id]);
```

Combined with decision 4 that punishes generosity — opting into all
interests would mean a form of thirty-odd rows and a dead grey button until
every last one is filled. It also contradicts the backend, which treats
skipping as first-class (`openapi.yaml`, shop tags: *"When a rater's most
recent visit skipped an interest, their earlier score for that interest
still counts"*).

**Decided: at least one rating enables Submit.**

## 6. The empty state distinguishes "no preferences" from "load failed"

`items` is empty in two unrelated situations: the profile has never set
preferences, or `getMyPreferences` rejected and the loader flattened the
rejection into `[]`. Those rendered identically — a heading, no rows, a dead
button, no explanation. A brand-new user and a backend outage looked the
same.

**Decided:** the loader reports which happened, and the page shows either a
link to `/preferences` or a retry-flavoured error. Never the preferences
link to someone who already has preferences.

## 7. Entry points

- **Shop page** (`/shop/:id`) gets a "Log a visit" action linking to
  `/experience-log/:shopId`. This is the real entry point — it's the only
  place in the app that already knows which café you mean.
- **Home page's "Log a Visit" card** links to `/search-page`. The card sits
  on a page with no café selected and the flow requires a `shopId`, so it
  routes through café selection rather than pretending to start the log.

## 8. `notes` is cut

The home page advertised *"Save private notes and ratings from a recent
visit."* There is no notes column on `visit`, no field on `VisitSchema`, no
property in `VisitRequest`, and no textarea on the form. Notes existed only
in that sentence.

**Decided: cut it,** and change the copy so the home page stops promising
it. Revisit as its own ticket if it's wanted — it needs a column, a schema
field, a spec entry, and a control.

## 9. Visit reads are scoped to the session profile

`selectAllVisits()` was `SELECT id, shop_id, profile_id, created_at FROM
visit` with no `WHERE` and no guard on its route, while the model comment
labelled it `GET apis/profiles/me/visits`. `GET /apis/visit` returned every
visit by every user — profile ids, shop ids, timestamps — to any
unauthenticated caller. `GET /apis/visit/:id` was likewise unguarded and did
no ownership check.

The page-level check in `experience-log.tsx` was guarding the UI, not the
data, and decision 1 deletes it anyway.

**Decided:** the list becomes `selectVisitsByProfileId`, both reads require
`isLoggedInController`, and get-by-id returns 403 for a visit the session
doesn't own. Both endpoints are kept (not deleted) as the foundation for a
future "your previous visits" page.

## 10. Path naming follows the spec

Three names for one entity were live at once: `openapi.yaml` said
`POST /apis/profiles/me/visits` and `GET /apis/visits/{id}`,
`visit.route.ts` mounted singular `/apis/visit`, and `ratings.route.ts`
mounted plural `/apis/visits` — two base paths one letter apart in the same
Express app.

`CLAUDE.md` is unambiguous: *"Design endpoints in
`documentation/openapi.yaml` BEFORE implementing them."*

**Decided: the spec wins.** Visit creation and the profile-scoped list live
at `/apis/profiles/me/visits`; get-by-id lives at `/apis/visits/:id`
alongside the ratings routes. The singular `/apis/visit` mount is gone, and
the `Location` header changes with it.

## Deferred: the matching algorithm

Ranking work is explicitly out of scope for this branch, but two defects
were identified and are recorded here so they aren't rediscovered.

### The distance function compares two different scales

`matching-algorithm.md` puts `importance` on 0–1 and `rating.value` on 1–5,
then subtracts one from the other:

```ts
sumSquares += importance * (importance - shopValue) ** 2
```

For a must-have interest (`importance = 1.0`), a café rated 5 contributes
`(1−5)² = 16` and a café rated 1 contributes `(1−1)² = 0`. Lower distance
ranks higher, so **the matcher ranks cafés worst-to-best on the interests
the user cares most about** — monotonically, not as an edge case. The
neutral default of 3 scores 4.0, beating every genuinely good rating.

**Agreed fix:** make `importance` weight-only (which is what the prose
already claims it is) and put the rating on the other side of the
subtraction in the same 0–1 space, penalising shortfall from ideal rather
than deviation from importance:

```ts
const NEUTRAL = 0.5                                     // == a raw rating of 3
const normalize = (value: number) => (value - 1) / 4    // 1–5 → 0–1

export function distance(
  preference: Record<string, number>,   // interestId -> importance (0–1), used as weight
  shop: Record<string, number>,         // interestId -> avg rating (1–5), missing = neutral
): number {
  let sumSquares = 0
  for (const [interestId, importance] of Object.entries(preference)) {
    const raw = shop[interestId]
    const shopValue = raw === undefined ? NEUTRAL : normalize(raw)
    sumSquares += importance * (1 - shopValue) ** 2
  }
  return Math.sqrt(sumSquares)
}
```

|                    | rated 5  | rated 3 | rated 1 |
| ------------------ | -------- | ------- | ------- |
| must-have (1.0)    | **0.00** | 0.25    | 1.00    |
| nice-to-have (0.5) | **0.00** | 0.125   | 0.50    |
| don't care (0)     | 0.00     | 0.00    | 0.00    |

Monotone in the right direction, weights behave, importance 0 drops out for
free, and `matchScore`'s documented "lower is closer" survives.

The literal target-distance model was rejected: it penalises a café for
*exceeding* a stated preference, so superb wifi scores worse than mediocre
wifi for someone who marked wifi nice-to-have. That is only correct for
two-sided attributes, and the `interest` taxonomy doesn't mark any.

### The matcher does not dedupe per profile

Shop tags dedupe — *"Each rater contributes exactly one score per interest —
their most recent one"* — but the matcher's aggregation is a flat average:

```sql
SELECT visit.shop_id, rating.interest_id, AVG(rating.value)
FROM rating JOIN visit ON visit.id = rating.visit_id
GROUP BY visit.shop_id, rating.interest_id
```

No `DISTINCT profile`, no most-recent-wins. One person logging the same café
five times gets five votes in a vector shared with every other user.

**Agreed fix:** dedupe to the most recent rating per profile per interest,
matching the tag aggregation.

### Minimum evidence is still unspecified

With blanks the default (decision 4), a user with eight preferences can be
served a café whose score is 1.75 of 1.75 guesswork — one real data point.
Score differences between sparsely-rated cafés then come from *how many
blanks they have* rather than how good they are, and since ties break on
`shop.name`, thin recommendations degrade toward alphabetical order. Rule 1
of the algorithm only excludes cafés with *zero* overlapping ratings; one
out of eight clears it.

Unresolved. Candidates: a coverage floor (rank only with real ratings on ≥N
dimensions), or a confidence penalty growing with the blank count.

## Deliberately not done

- **`CHECK` constraints on `rating.value` and `preference.importance`.**
  `matching-algorithm.md` recommends `CHECK (value BETWEEN 1 AND 5)`
  *"before implementing rating"*; both columns remain bare `decimal`.
  Decided against for now, which makes **server-side Zod the only
  enforcement** — so validation of the ratings array in the new endpoint has
  to be exhaustive, since nothing underneath it will catch a bad row.
- **Idempotency on visit creation.** Refresh, back-then-resubmit, or a
  double-click each write another visit. The per-profile dedupe fix above
  contains the damage to *ranking*, but a future "your previous visits" page
  will display trips the user never took.
- **The three orphaned rating endpoints.** `POST /apis/visits/:visitId/ratings`,
  `PUT /apis/visits/:visitId/ratings/:interestId`, and the 409→PUT retry in
  `rating.model.ts` have no caller once ratings arrive with their visit.
  Left mounted; deletion undecided.

## Verification

- `POST /apis/profiles/me/visits` with a valid `shopId` and a ratings array
  returns 201 with the visit, and the rating rows exist.
- The same call with one invalid `interestId` returns 4xx and writes
  **nothing** — no visit row, no partial ratings.
- Unauthenticated `GET /apis/profiles/me/visits` returns 401; authenticated
  returns only that profile's visits.
- `GET /apis/visits/:id` for another profile's visit returns 403.
- `/experience-log/:shopId` renders the café and the profile's preferred
  interests; the toggle expands to all interests; Submit is disabled at zero
  ratings and enabled at one.
- A profile with no preferences sees a link to `/preferences`; a profile
  whose preference fetch fails sees an error instead of that link.
