# Plan: wire up the preferences form

Status: **implemented.** Decisions confirmed during implementation:
- Value mapping (revised after initial implementation): `no` → `importance:
  0` — a real, persisted answer, submitted like any other rating. This
  doubles as the answer to "delete on downgrade": re-saving an interest as
  `no` overwrites (via the existing 409→PUT retry) a previously saved
  `nice`/`must` for that interest instead of leaving it stale. `nice` →
  `3`, `must` → `5`. Only interests the profile has never touched
  (`prefs[id]` is `undefined`) are left out of the submission — importance
  is `0`–`5` on both frontend and backend (`PreferenceRequestSchema`,
  `PreferenceModel`) and in `openapi.yaml` to allow this.
- Explicit deletion (a `DELETE` call, vs. overwriting with `0`) is still out
  of scope — not needed now that "no" persists as `0`.
- Must-have tie-break: differentiated — the picked item gets `importance: 5`,
  the other "must" items get `importance: 4`. Skipping the sheet (or the
  backdrop/"Skip for now") leaves every "must" item at `5`.

## Context

`frontend/app/routes/preferences.tsx` already loads interests from the
backend (`getAllInterest`) and renders a "no / nice / must" rating control
per interest, but submission is a no-op: `finalizeSave()` just
`console.log`s a payload and closes the must-have tie-break sheet. Nothing
is persisted.

Two established patterns in this codebase need to be combined to wire this
up for real:

- **The remix-hook-form scaffolding** used by `sign-in.tsx` / `sign-up.tsx`:
  a Zod schema + `zodResolver`, `useRemixForm` in the component,
  `getValidatedFormData` in the `action`, `FormActionResponse` as the
  action's return type, `<FieldError>` / `<StatusMessage>` for feedback, and
  `<Form onSubmit={handleSubmit} noValidate method="POST">` from
  `react-router`.
- **The authenticated, CSRF-protected mutation** pattern used by
  `favorite.ts` / `favorite.model.ts`: pull `profile` + `authorization` off
  the session (redirect to `/sign-in` if missing), and send the
  session-issued CSRF token as the `Authorization` header on the backend
  call. Sign-in/sign-up don't need this (the user isn't authenticated yet);
  preferences does.

Neither pattern alone covers this form, because the interest list is
dynamic (N interests from the loader, not a fixed set of named fields) and
each rating is a custom keyboard-navigable button-group, not a native input
`register()` can bind to directly.

### The backend isn't ready yet

`documentation/openapi.yaml` **already documents** the contract this plan
targets (search `Preference` in that file):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/apis/profiles/me/preferences` | create one preference — body `{ interestId, importance }`, `importance` is `1`–`5` |
| `GET` | `/apis/profiles/me/preferences` | list the signed-in profile's preferences |
| `PUT` | `/apis/profiles/me/preferences/{interestId}` | update one preference's importance |
| `DELETE` | `/apis/profiles/me/preferences/{interestId}` | idempotent remove |

`profileId` is never in the request body — the server takes it from the
session, per this repo's API conventions.

But `backend/src/apis/preferences/preference.model.ts` only has the Zod
schema; `setPreference`/`selectAllInterest`(sic) are commented out, and
there is **no controller, no route, and no registration in `App.ts`**. The
frontend cannot be wired against an endpoint that doesn't exist, so the
backend work below has to land first (or alongside).

### The data-shape mismatch that needs a decision

The UI rates each interest on a 3-way scale (`no` / `nice` / `must`); the
backend's `importance` is a `1`–`5` number. These need an explicit mapping.
Proposed, to confirm before implementing:

- `no` → **no request sent** — "don't care" isn't a weighted preference, so
  no row is created for that interest.
- `nice` → `importance: 3`
- `must` → `importance: 5`

This also means the must-have tie-break sheet's "if a cafe only got one of
these right, which?" answer isn't captured anywhere distinct today (every
button in that sheet just calls `finalizeSave`) — that stays true after
this change unless we decide to differentiate the picked item (e.g.
`importance: 5` for the pick, `importance: 4` for the rest). Flagging as an
open question rather than deciding it here.

## Backend work

Follow `documentation/CHECKLIST.md`'s per-endpoint list and the
`favorites.*` trio as the structural template (closest existing
association-entity — no surrogate id, composite key, profile-scoped).

1. **`preference.model.ts`** — uncomment and finish `setPreference` /
   `selectPreferencesByProfileId`, matching `favorites.model.ts`'s shape
   (parameterized `sql` tag, `PreferenceModel.parse` / `.array().parse()`
   on the way out). Table already exists (`sql/project.sql`, composite PK
   `(profile_id, interest_id)`), so no migration needed.
2. **`preference.controller.ts`** (new) — `postPreferenceController`,
   `putPreferenceController`, `getMyPreferencesController`, modeled on
   `favorites.controller.ts`: one `try`/`catch` per handler, `profileId`
   from `request.session.profile.id` (never the body), Zod validation via
   `sendZodError`, Postgres `23505` → `409` (preference already exists —
   client should retry as `PUT`), `23503` → `404` (interestId doesn't
   exist), everything else → `sendServerError`.
3. **`preference.route.ts`** (new) — `isLoggedInController` on
   `POST`/`PUT`/`DELETE`; `GET` just needs a valid session, no CSRF. Base
   path `/apis/profiles/me/preferences`, matching the doc.
4. **Register in `App.ts`** alongside `favoritesRoute`.
5. `openapi.yaml` already matches this design — no changes expected, but
   double check when implementation is done (the checklist wants the spec
   and the implementation to agree, spec wins if they don't and you update
   the spec in the same commit).
6. `.http` smoke test for `POST`/`PUT`/`GET` covering the documented status
   codes (`201`, `200`, `400`, `401`, `404`, `409`). No sibling endpoint has
   one of these yet in this repo, so this would be the first — still worth
   doing per the checklist.

## Frontend work

1. **`frontend/app/utils/models/preference.model.ts`** (new):
   - `PreferenceRequestSchema` (`interestId` uuid + `importance` `1`–`5`
     number), inferred `PreferenceRequest` type — same shape as
     `favoriteSchema`.
   - `postPreference(entry, authorization, cookie)`: same header/credential
     shape as `postFavorite` (`Content-Type`, `Authorization`, optional
     `Cookie`, `credentials: 'include'`), body `{ interestId, importance }`.
     On a `409` (preference already exists — e.g. the user is re-saving),
     retry once as `PUT /apis/profiles/me/preferences/{interestId}` with
     `{ importance }`, so re-submitting the form doesn't require first
     loading and diffing existing preferences.
   - `postPreferences(entries, authorization, cookie)`: `Promise.all` over
     `postPreference`, collapsed into a single `Status` (success, or the
     first failure's message) for the action to return — same shape
     `postSignUp`/`postSignIn` already produce.

2. **`frontend/app/routes/preferences.tsx`**:
   - `PreferencesFormSchema = z.object({ preferences:
     z.array(PreferenceRequestSchema) })`, `resolver =
     zodResolver(PreferencesFormSchema)` at module scope, matching
     `SignUpSchema`/`resolver` in `sign-up.tsx`. (Unlike sign-up, the valid
     `interestId` set isn't known at module scope — it comes from the
     loader — so cross-check submitted ids against the loaded interests
     inside the `action`, not in the schema.)
   - `action`: combine `favorite.ts`'s session guard (pull `profile` +
     `authorization` off the session, redirect to `/sign-in` if missing)
     with sign-up's `getValidatedFormData` + `FormActionResponse` return
     shape. On validation errors, return `{ errors, defaultValues }`. On
     success, call `postPreferences(data.preferences, authorization,
     cookie)` and return `{ success, status }`.
   - Component: keep the existing `prefs` local state, `optionRefs`, and
     keyboard-nav handlers as-is — the button-group isn't a native input,
     so react-hook-form can't `register()` it directly. Add `useRemixForm`
     and bridge the two by calling `setValue("preferences", derived)`
     whenever `prefs` changes (e.g. inside `toggleValue`, or a `useEffect`
     keyed on `prefs`), where `derived` applies the no/nice/must → skip/3/5
     mapping over `items`.
   - Swap the plain `<form onSubmit={handleSubmit}>` (added when the
     rating list was put in a form) for `react-router`'s `<Form
     onSubmit={handleSubmit} noValidate method="POST">`, with
     `handleSubmit` now coming from `useRemixForm` — matching sign-in/up
     exactly instead of the hand-rolled wrapper.
   - Keep the must-have soft-cap sheet (`handleSave` /
     `MUST_HAVE_SOFT_CAP`) as a pre-submit guard: it still intercepts
     before RHF's `handleSubmit` fires when 5+ items are marked "must",
     same as today.
   - Add `useActionData<typeof action>()` and `<StatusMessage
     actionData={actionData} />` near the submit button, matching
     sign-in/up. Skip `<FieldError>` per item — the schema is one array
     field, not one field per interest, so there's no natural per-row
     place to anchor a field-level error; surface array-level validation
     failures through `StatusMessage` instead.

## Open questions to confirm before implementing

- Confirm (or adjust) the `no` → skip / `nice` → `3` / `must` → `5`
  mapping.
- Should downgrading an interest to `no` on a later visit delete its
  existing preference row? Doing that requires the loader to also fetch
  the profile's current preferences (`GET /apis/profiles/me/preferences`)
  and seed `prefs` from them — out of scope for this first pass, called out
  as a fast-follow.
- Should the must-have tie-break sheet's picked item get a distinct
  `importance` (e.g. `5` for the pick, `4` for the rest)? Currently no
  answer from that sheet is captured at all.

## Verification

- `npm run typecheck` (frontend) clean.
- Backend `.http` requests against the new endpoints for each documented
  status code.
- Manual walkthrough: sign in, visit `/preferences`, rate a few items,
  submit, confirm the network tab shows the expected `POST`/`PUT` calls
  with `201`/`200` responses, and that `StatusMessage` reflects success.
- Re-submit the form a second time and confirm the `409`→`PUT` retry path
  actually updates rather than erroring.
