# Mobile, Java and Supabase contract

The implementation sources are [HTTP mappings](../backend/src/main/java/edu/roosevelt/pantry/api/PantryController.java), [input DTOs](../backend/src/main/java/edu/roosevelt/pantry/api/Inputs.java), [service projections and transactions](../backend/src/main/java/edu/roosevelt/pantry/service/PantryService.java), [mobile types](../mobile/src/types.ts) and [the SQL migration](../backend/src/main/resources/db/migration/V1__pantry_schema.sql). Use [BUILD](BUILD.md) for outstanding verification and [ARCHITECTURE](ARCHITECTURE.md) for the other routes.

## Authentication and transport

Signup is open. Expo sends email/password to Supabase Auth, then sends the access token to Java in `Authorization: Bearer <token>`. The base path is `/api/v1`. Send JSON bodies with `Content-Type: application/json`. Java verifies the JWT signature, issuer, expiry, audience `authenticated` and UUID subject. All users are MEMBER unless their subject matches the verified server setting `ADMIN_USER_ID`. A blank setting grants admin access to nobody. Owners and roles come exclusively from the authenticated subject. Only the server connects through JDBC to the private `pantry` schema. RLS and grants deny the mobile client table access.

## Core operations

Each success below returns HTTP 200 and JSON, including POST and idempotent replay.

| Method and path under /api/v1 | Caller and input | Response and behavior |
| --- | --- | --- |
| GET /items | Signed-in. Optional string query parameters `search` (name substring), `category` (empty, Food or Hygiene), `sort` (name by default, or id). | Item array of non-archived lots. Name sorting uses the course Bubble Sort. Expired and zero-quantity lots may appear. |
| GET /items/{id} | Signed-in. Integer lot ID in path. | One Item. Unknown or archived lot returns 404. |
| POST /requests | Signed-in. `idempotencyKey` UUID string and `lines` array of 1–5 objects with positive integer `itemId` and integer `quantity` from 1–5. Each lot appears once. | A fresh submission returns a PENDING Request. No reservation or quota deduction. Retrying the same key, account and basket returns the same request in its current state, regardless of line order. Changing that basket returns 409. |
| GET /requests/mine | Signed-in. No body. | Own Request array, newest queue entry first, including decided requests. Expo refreshes this route after submission. |
| GET /requests/{id} | Owner or admin. Integer request ID. | One Request. For a member, an unknown ID and another member's ID both return 404. |
| GET /admin/requests | Admin only. No body. | Request array with PENDING first, followed by decided entries. Each group is sorted by ascending queue sequence. |
| POST /admin/requests/{id}/decision | Admin only. Integer request ID. Body `{"action":"APPROVE"}` or `{"action":"DECLINE","reason":"…"}`. A pending decline requires a nonblank reason. Maximum 500 characters. | Returns the decided Request. A later pending ID returns 409. A previously decided ID returns its existing result, even on another attempt. It cannot advance a different request. |

**Item fields.** `itemId` (integer lot ID), `name` (string), `category` (Food or Hygiene), `quantity` (nonnegative whole units), `expirationDate` (YYYY-MM-DD or null), and `availability` (EXPIRED, OUT_OF_STOCK at zero, LOW_STOCK at 1–4 or IN_STOCK at 5+). Expiration strictly before the Chicago business date takes precedence.

**Request fields.** `id` (integer request ID), `userId` (owner UUID string), `displayName` (string), `status` (PENDING, APPROVED or DECLINED), `totalUnits` (integer sum of requested quantities), `submittedAt` (timestamp string with UTC offset), `decidedAt` (timestamp string or null), `decisionReason` (string or null), and `lines` (array ordered by lot ID). Each line contains integer `itemId` and `quantity`, string `name` and `category`, and nullable date `expirationDate`. Line descriptions are snapshots taken when the request was submitted.

**Approval.** Java acquires a transaction-scoped PostgreSQL advisory lock before reading the queue. On the oldest pending request it rechecks stock, expiry and the owner's remaining allowance at decision time. Each account may receive five approved units per Monday–Sunday week in America/Chicago. An approval commits status, one stock movement per lot, resulting stock and weekly quota together. If a domain recheck fails, the decision returns **200 with DECLINED and a reason**, leaving stock and quota untouched. The client must inspect the returned status even when the submitted action was APPROVE.

## Other inventory mutations

All require admin. POST /admin/items accepts `itemId`, `name` (nonblank, max 120), `category`, `quantity` and nullable `expirationDate` as defined for Item. A new lot cannot already be expired. POST /admin/items/{id}/restocks accepts `{"quantity":2}`, a positive whole-unit delta for the same lot and date. Both return Item. POST /admin/inventory/remove-expired takes no required body and returns `removedCount` (integer lots) and `removedItems` (Item snapshots). Java archives those lots and keeps request/stock history.

## Errors clients can handle

Application errors contain `code` and `message` strings plus `fields`, an object mapping input paths to messages. Refresh before retrying stock or FIFO conflicts. Keep the submission key on a network retry.

| HTTP | Code | Example |
| --- | --- | --- |
| 400 | INVALID_INPUT, REASON_REQUIRED, EXPIRED_DATE | Invalid category/sort, duplicate lot lines, malformed UUID, invalid quantities, missing decline reason or new expired lot |
| 401 | UNAUTHENTICATED | Missing, expired or invalid bearer token |
| 403 | FORBIDDEN | Member called an admin route |
| 404 | NOT_FOUND | Missing lot/request or inaccessible request |
| 409 | CONFLICT | Submission exceeds allowance/stock, key reused with different lines, stale FIFO choice or expired lot restock |
| 500 | INTERNAL_ERROR | Unexpected service error |

## Shared example and verification

[request.json](../backend/src/test/resources/contracts/request.json) is the shared example. Send its `submit` object as the POST body. Use its `pending` object as the POST/detail response or wrap it in an array for history. IDs, names and times are synthetic. The example can drive mobile work without a running Supabase project.

From the repository root, run `mvn -f backend/pom.xml -Dtest=SubmitContractTests test` with Java 21. This checks the Java submit DTO and serializes the real detail controller's output with the application Jackson mapper over deterministic JDBC rows. From `mobile/`, run `npm ci`, `npm run typecheck` and `node --experimental-strip-types --test tests/request-contract.test.mjs`. The TypeScript consumer checks both payloads against the types used by Expo and verifies that the quantities displayed correspond to the submitted basket. Full CI also exercises the database and Docker separately. See [STATUS](STATUS.md) for the state of live Auth, device tests and production.
