# API Conventions

Paste this section into your capstone's `CLAUDE.md` (and/or `README.md`) so every
work session — yours or your AI assistant's — follows the same rules.

```markdown
## API Conventions

- Design endpoints in `documentation/openapi.yaml` BEFORE implementing them.
- Real HTTP status codes: 201 create (+ Location header), 200 read, 204 delete,
  400/401/403/404/409/500 errors. Never 200 with an error in the body.
- Success bodies return the resource (or array) directly — no
  `{ status, message, data }` wrapper.
- Every error uses the ErrorResponse shape via `sendError` / `sendZodError` /
  `sendServerError` in `src/utils/response.utils.ts`. Never build an ad-hoc
  error body with `response.json()`.
- Request schemas omit server-owned fields: `id` (server generates uuidv7),
  actor foreign keys like `profileId` (from the session, NEVER the request
  body), and timestamps (DB `DEFAULT NOW()`).
- Guard state-changing routes (POST/PUT/DELETE) with `isLoggedInController`
  (session cookie + CSRF token in the `Authorization` header). Safe reads
  check the session directly, no CSRF.
- DELETEs are idempotent 204s; duplicates are 409 Conflict; a missing
  referenced row is 404 (Postgres SQLSTATE 23505 → 409, 23503 → 404).
- Implementation order per entity: SQL table → model → controller → route →
  register in App.ts → `.http` test.
- Dependency direction is one-way: route → controller → model → sql.
  Routes never touch SQL; models never touch request/response.
```
