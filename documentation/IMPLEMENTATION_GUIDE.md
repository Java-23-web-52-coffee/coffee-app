# API Implementation Guide

How to turn a path in your `openapi.yaml` (start from
[`openapi.template.yaml`](./openapi.template.yaml)) into working code, using the
structure from the `express-spin-up-instructions` skeleton (Express + TypeScript +
PostgreSQL + Redis).

The walk-through below implements the **Keyword** entity — the same worked
example that ships in the template — so you can follow along line by line.

Design the API in `openapi.yaml` **first**, then implement each path by writing
four things in order: **SQL table → model → controller → route** (then register
it and test it).

---

## 1. Project structure

Every entity is a folder under `backend/src/apis/` with three files:

```
backend/
  src/
    apis/
      <entity>/
        <entity>.model.ts        # zod schema(s) + SQL functions (the data layer)
        <entity>.controller.ts   # request/response handlers (the HTTP layer)
        <entity>.route.ts        # Router: maps HTTP verb + path -> controller
    utils/
      database.utils.ts          # the `sql` postgres client
      response.utils.ts          # sendError / sendZodError / sendServerError
      controllers/
        is-logged-in.controller.ts   # auth + CSRF guard middleware
    App.ts                       # registers every route
    index.ts                     # entry point
  sql/project.sql                # CREATE TABLE statements
```

**One-way dependency:** `route → controller → model → sql`. Routes never touch
SQL; models never touch `request`/`response`.

---

## 2. The response contract

This project uses **real HTTP status codes** and returns the **resource directly**
— no `{ status, message, data }` envelope. Every error is an `ErrorResponse`.

> The skeleton's starter `response.utils.ts` uses the older envelope
> (`createStatus` / `zodErrorResponse` / `serverErrorResponse`). Replace it with
> the helpers below so your code matches `openapi.yaml`.

```ts
// backend/src/utils/response.utils.ts
import type { Request, Response } from 'express'
import { STATUS_CODES } from 'node:http'
import type { ZodError } from 'zod/v4'

export interface ErrorResponse {
	timestamp: string
	status: number
	error: string
	message: string
	path: string
	details?: unknown
}

/** Send a structured error with a real HTTP status code. */
export function sendError (request: Request, response: Response, status: number, message: string, details?: unknown): void {
	const body: ErrorResponse = {
		timestamp: new Date().toISOString(),
		status,
		error: STATUS_CODES[status] ?? 'Error',
		message,
		path: request.originalUrl
	}
	if (details !== undefined) body.details = details
	response.status(status).json(body)
}

/** 400 built from a failed zod safeParse. */
export function sendZodError (request: Request, response: Response, error: ZodError): void {
	const message = error.issues[0]?.message ?? 'A validation error occurred'
	const details = { issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
	sendError(request, response, 400, message, details)
}

/** 500 with a generic message (never leak internals). */
export function sendServerError (request: Request, response: Response): void {
	sendError(request, response, 500, 'internal server error occurred try again later')
}
```

### Status code cheat-sheet

| Situation | Status | Body |
| --- | --- | --- |
| Created a resource | `201` + `Location` header | the created resource |
| Read a resource / list | `200` | the resource / array |
| Deleted a resource | `204` | *(empty)* |
| Invalid request body/params | `400` | `ErrorResponse` (with `details`) |
| Not signed in | `401` | `ErrorResponse` |
| Signed in but not allowed (bad CSRF token, not the owner) | `403` | `ErrorResponse` |
| Resource doesn't exist | `404` | `ErrorResponse` |
| Conflicts with existing state (duplicate) | `409` | `ErrorResponse` |
| Unexpected failure | `500` | `ErrorResponse` |

---

## 3. Step-by-step: implement one path

We'll implement a made-up `keyword` entity from this OpenAPI path:

```yaml
/apis/keyword:
  post:                       # create — server owns the id
    requestBody:  { $ref: '#/components/schemas/KeywordRequest' }   # { name }
    responses:
      '201': { ... Keyword, Location header ... }
      '409': { ... duplicate name ... }
/apis/keyword/{id}:
  get:
    responses: { '200': Keyword, '404': ErrorResponse }
```

### Step 0 — Read the scheme
From the path + schemas, note: the **request** shape (`KeywordRequest = { name }`),
the **response** shape (`Keyword = { id, name }`), which fields are **server-owned**
(`id`), the **status codes**, and whether it's **guarded** (has `security:`).

### Step 1 — SQL table (`sql/project.sql`)
```sql
CREATE TABLE IF NOT EXISTS keyword (
    id UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,   -- uuidv7() requires PostgreSQL 18
    name VARCHAR(32) NOT NULL UNIQUE
);
```

### Step 2 — Model (`keyword.model.ts`)
The zod schema is the single source of truth for shape **and** validation.
The request schema is derived from it, so the two never drift.

```ts
import { z } from 'zod/v4'
import { sql } from '../../utils/database.utils.ts'

export const KeywordSchema = z.object({
	id: z.uuidv7('Please provide a valid uuid for keyword id'),
	name: z.string('Please provide a valid keyword name').trim().min(1).max(32)
})
export type Keyword = z.infer<typeof KeywordSchema>

// request = only what the client controls (server owns the id)
export const KeywordRequestSchema = KeywordSchema.pick({ name: true })

export async function insertKeyword (keyword: Keyword): Promise<string> {
	await sql`INSERT INTO keyword (id, name) VALUES (${keyword.id}, ${keyword.name})`
	return 'Keyword successfully created'
}

export async function selectKeywordByKeywordId (id: string): Promise<Keyword | null> {
	const rowList = await sql`SELECT id, name FROM keyword WHERE id = ${id}`
	return KeywordSchema.array().max(1).parse(rowList)[0] ?? null   // parse enforces the row shape
}
```

Naming: `insert<Entity>`, `select<Entity>By<Field>`, `update<Entity>`,
`delete<Entity>`. `postgres.js` maps `snake_case` columns to `camelCase` fields
automatically, so select `id, name` and get `{ id, name }` back.

### Step 3 — Controller (`keyword.controller.ts`)
Every handler follows the same skeleton: **validate → (auth) → do work → send**.
Wrap the body in one `try`; the `catch` handles unexpected errors (and maps known
SQL errors to real status codes).

```ts
import type { Request, Response } from 'express'
import { v7 as uuidv7 } from 'uuid'
import { type Keyword, insertKeyword, selectKeywordByKeywordId, KeywordSchema, KeywordRequestSchema } from './keyword.model.ts'
import { sendError, sendServerError, sendZodError } from '../../utils/response.utils.ts'

const UNIQUE_VIOLATION = '23505'   // Postgres SQLSTATE for a duplicate key

export async function postKeywordController (request: Request, response: Response): Promise<void> {
	try {
		const validationResult = KeywordRequestSchema.safeParse(request.body)   // 1. validate
		if (!validationResult.success) { sendZodError(request, response, validationResult.error); return }

		const keyword: Keyword = { id: uuidv7(), name: validationResult.data.name }   // 2. server owns the id
		await insertKeyword(keyword)                                                   // 3. do work
		const created = await selectKeywordByKeywordId(keyword.id)                     //    re-read for the canonical row

		response.status(201).location(`/apis/keyword/${keyword.id}`).json(created)     // 4. send: 201 + Location + resource
	} catch (error: any) {
		if (error?.code === UNIQUE_VIOLATION) { sendError(request, response, 409, 'A keyword with that name already exists.'); return }
		console.error(error)
		sendServerError(request, response)
	}
}

export async function getKeywordByKeywordIdController (request: Request, response: Response): Promise<void> {
	try {
		const validationResult = KeywordSchema.pick({ id: true }).safeParse({ id: request.params.id })
		if (!validationResult.success) { sendZodError(request, response, validationResult.error); return }

		const keyword = await selectKeywordByKeywordId(validationResult.data.id)
		if (keyword === null) { sendError(request, response, 404, `No keyword exists with id ${validationResult.data.id}`); return }

		response.status(200).json(keyword)
	} catch (error: any) {
		console.error(error)
		sendServerError(request, response)
	}
}
```

### Step 4 — Route (`keyword.route.ts`)
```ts
import { Router } from 'express'
import { postKeywordController, getKeywordByKeywordIdController } from './keyword.controller.ts'
import { isLoggedInController } from '../../utils/controllers/is-logged-in.controller.ts'

const basePath = '/apis/keyword' as const
const router = Router()

router.route('/')
	.post(isLoggedInController, postKeywordController)   // guarded: create needs auth + CSRF
router.route('/:id')
	.get(getKeywordByKeywordIdController)                // public read

export const keywordRoute = { basePath, router }
```

**Route ordering matters:** register **literal/more-specific paths before
parameterized ones**. `router.route('/me')` must come before `router.route('/:id')`,
or `/me` gets parsed as an `:id`.

### Step 5 — Register in `App.ts`
```ts
import { keywordRoute } from './apis/keyword/keyword.route.ts'
// ...inside routes():
this.app.use(keywordRoute.basePath, keywordRoute.router)
```

### Step 6 — Test it (`backend/http/keyword.http`)
Use a `.http` file (JetBrains/WebStorm HTTP Client) to drive the endpoint and
assert the real status codes:

```
### Create a keyword -> 201
POST {{baseUrl}}/apis/keyword
Content-Type: application/json
Authorization: {{csrfToken}}

{ "name": "typescript" }

> {%
    client.test("status is 201", () => client.assert(response.status === 201));
    client.global.set("keywordId", response.body.id);
%}

### Get it back -> 200
GET {{baseUrl}}/apis/keyword/{{keywordId}}
> {% client.test("status is 200", () => client.assert(response.status === 200)); %}
```

---

## 4. Recurring patterns

### Server-owned fields — never trust the client
The **request** carries only what the client controls. The server assigns
identity and timestamps and returns them in the **response**:

- `id` → generated with `uuidv7()` (or the DB's `DEFAULT uuidv7()`).
- actor foreign keys (e.g. a like's `profileId`, a follow's `followerId`) → taken
  from `request.session.profile`, **never** the request body.
- `datetime` / `created` → the DB `DEFAULT NOW()`; re-read the row to return it.

So a create request schema is the resource schema **minus** the server-owned
fields: `ThreadRequestSchema = ThreadSchema.pick({ content, replyThreadId, imageUrl })`.

### Auth: session cookie (identity) + CSRF token (guard)
- **Sign-in** stores identity in the session (the cookie) and returns a CSRF token
  in the `Authorization` response header.
- Guard **state-changing** routes with `isLoggedInController`. It requires the
  session **and** the `Authorization` header echoed back, matching the session's
  token → **401** if not signed in, **403** if the token is missing/wrong.
- **Safe reads** (`GET /apis/profile/me`) check `request.session.profile` directly
  and are *not* CSRF-guarded.

### Mapping SQL errors to status codes
In the `catch`, inspect `error.code` (Postgres SQLSTATE):

| SQLSTATE | Meaning | Status |
| --- | --- | --- |
| `23505` | unique violation (duplicate) | `409 Conflict` |
| `23503` | foreign-key violation (referenced row missing) | `404 Not Found` |

Everything else → `sendServerError` (500).

### Composite-key (join) tables — like, follow, tag
These have no surrogate `id`; the primary key is the pair of foreign keys.

- No `GET /:id`; identify a row by both keys, e.g.
  `GET /apis/like/profile/:profileId/thread/:threadId`.
- `DELETE` is **idempotent** → `204` whether or not a row existed.
- Offer **flat and nested** routes that share one controller. Read the parent id
  from either source: `request.params.threadId ?? request.body?.threadId`.
  - flat: `POST /apis/like { threadId }`
  - nested: `POST /apis/thread/:threadId/like` (register the nested route in the
    *parent's* route file — `thread.route.ts`).

### Naming conventions

| Thing | Pattern | Example |
| --- | --- | --- |
| Model – insert | `insert<Entity>` | `insertThread` |
| Model – read | `select<Entity>By<Field>` | `selectThreadByThreadId` |
| Controller | `<verb><Entity>...Controller` | `postThreadController` |
| Route export | `<entity>Route` | `threadRoute` |
| Base path | `/apis/<entity>` | `/apis/thread` |

---

## 5. Checklist for each endpoint

- [ ] Path + request/response schemas defined in `openapi.yaml`.
- [ ] Table in `sql/project.sql` (surrogate ids `DEFAULT uuidv7()`).
- [ ] Model: zod schema, inferred type, request schema, SQL function(s).
- [ ] Controller: validate → (auth) → work → send; single `try`/`catch`.
- [ ] Real status codes + resource-direct body; errors via `sendError`/`sendZodError`.
- [ ] Route wired; guards on state-changing routes; specific routes before `/:id`.
- [ ] Registered in `App.ts`.
- [ ] `.http` test covering the happy path + the 400/401/403/404/409 cases.
