# Capstone API Checklists

Two checklists: one you run **once** on your `openapi.yaml` before writing any
code, and one you run **per endpoint** as you implement. Answer every question
honestly — each one encodes a convention from the standards.

---

## 1. Spec review — before you write any code

Run this on your tailored `openapi.yaml`. Bring the file (and this checklist)
to your spec review.

### Mechanical

- [ ] The file passes validation in https://editor.swagger.io with no errors.
- [ ] `info.title` and `info.version` describe YOUR project (no TEMPLATE text
      or `TODO(replace-me)` markers left anywhere).
- [ ] Every entity from your ERD appears as a tag with at least one path.
- [ ] Every operation has a unique camelCase `operationId`.

### The response contract

- [ ] Does every create return `201` with a `Location` header and the created
      resource as the body?
- [ ] Does any success response wrap the resource in
      `{ status, message, data }`? *(If yes — unwrap it. The resource IS the
      body.)*
- [ ] Is every delete an idempotent `204` with an empty body?
- [ ] Is every error response a `$ref` to a shared component
      (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`)
      rather than an inline one-off?
- [ ] Do duplicate-creating operations document a `409`?

### Schemas

- [ ] Does every entity have BOTH a resource schema (`Widget`) and a request
      schema (`WidgetRequest`)?
- [ ] Can a client submit `id`, `profileId`, or any timestamp in a request
      body? *(If yes — remove it. The server owns identity and time.)*
- [ ] Do string fields carry `minLength`/`maxLength` that match your SQL
      column sizes and Zod rules?
- [ ] Do all ids reference the shared `Uuid` schema?

### Security

- [ ] Does every state-changing operation (POST/PUT/DELETE) declare
      `security:` with `sessionCookie` + `csrfToken`?
- [ ] Are public reads (GETs) free of `security:` unless they genuinely need
      the session?
- [ ] Do guarded operations document `401` (and `403` where ownership
      matters)?

---

## 2. Per-endpoint — as you implement

Copy this list into your task tracker once per endpoint.

- [ ] Path + request/response schemas defined in `openapi.yaml` FIRST.
- [ ] Table in `sql/project.sql` (surrogate ids `DEFAULT uuidv7()`).
- [ ] Model: Zod schema, inferred type, request schema derived with `.pick()`,
      SQL function(s) named `insert<Entity>` / `select<Entity>By<Field>` / etc.
- [ ] Controller: validate → (auth) → work → send; one `try`/`catch`;
      known SQLSTATEs mapped (23505 → 409, 23503 → 404); everything else →
      `sendServerError`.
- [ ] Responses use real status codes + resource-direct bodies; every error
      goes through `sendError` / `sendZodError`.
- [ ] Route wired; `isLoggedInController` on state-changing routes;
      literal paths registered BEFORE parameterized ones (`/me` before `/:id`).
- [ ] Registered in `App.ts`.
- [ ] `.http` test covering the happy path AND the documented error codes
      (400/401/403/404/409), asserting the real status on each.
- [ ] The implemented behavior matches `openapi.yaml` exactly — if you changed
      your mind during implementation, update the spec in the same commit.
