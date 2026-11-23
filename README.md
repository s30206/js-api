# PC Parts Store API

A REST API for a small online shop selling PC components (CPUs, GPUs, RAM, motherboards, PSUs, storage, cases).
It is a pet project built with **Node.js + Express 5** on top of **PostgreSQL**, using a **layered architecture**
with a **repository layer on Prisma ORM** and **JWT authentication**.
The whole system runs in **Docker**.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Authentication & authorization](#authentication--authorization)
6. [Database](#database)
7. [Business rules](#business-rules)
8. [API reference](#api-reference)
9. [Configuration](#configuration)
10. [Running with Docker](#running-with-docker)
11. [Seed data](#seed-data)
12. [Health](#health)
13. [npm scripts](#npm-scripts)
14. [Known limitations & trade-offs](#known-limitations--trade-offs)

---

## Features

- **Accounts**: public customer registration, login, profile, password change, address book.
- **Roles**: `customer` and `admin`, enforced by middleware and per-resource ownership checks in services.
- **Catalog**: categories, brands and products with category-specific specs stored as `JSONB`
  (e.g. CPU socket, GPU VRAM), filtering, sorting and pagination. Products are soft-deleted.
- **Cart**: persistent server-side cart per customer.
- **Orders**: checkout from the cart in a single transaction (row locks, stock decrement, price snapshot),
  order lifecycle `pending → paid → shipped → delivered` (or `cancelled`), stock restored on cancel.
- **Mock payments**: a simulated payment provider with a configurable random success rate. Every attempt is recorded.
- **Reviews**: 1–5 star ratings with comments, only for verified buyers (delivered order), one review per product per user.
- **JWT auth**: stateless 1-hour access tokens; logging out means the client discards its token.
- **Ops**: Swagger UI, health endpoint, Docker Compose setup.

---

## Tech stack

| Concern            | Choice                                                                 |
|--------------------|------------------------------------------------------------------------|
| Runtime            | Node.js 24 LTS, JavaScript, **ES modules** (`"type": "module"`)        |
| HTTP framework     | Express 5 (native async error propagation, no async wrapper needed)    |
| Database           | PostgreSQL 18                                                          |
| ORM                | Prisma 7: `@prisma/client` with the `@prisma/adapter-pg` driver adapter |
| Schema             | One SQL init script (`db/init.sql`) run by the Postgres container; `prisma/schema.prisma` introspected from it |
| Validation         | `express-validator`                                                    |
| Auth               | `jsonwebtoken` (HS256), `bcryptjs` for password hashing                |
| API docs           | `swagger-ui-express` serving a hand-written `openapi.yaml` (parsed with `yaml`) |
| Containers         | Docker, Docker Compose (`api` + `db`)                                  |

---

## Architecture

The application is split into strict layers. Each layer only talks to the layer directly below it.

```mermaid
flowchart LR
    Client([HTTP client]) --> Routes
    subgraph API container
        Routes["Routes<br/>(middleware chain + validators)"] --> Controllers
        Controllers --> Services
        Controllers --> Mappers
        Services --> Repositories
        Services -. "transactions" .-> Prisma
        Repositories --> Prisma["Prisma Client<br/>(@prisma/adapter-pg)"]
    end
    Prisma --> DB[(PostgreSQL)]
```

| Layer            | Responsibility                                                                                         | Must NOT                                       |
|------------------|--------------------------------------------------------------------------------------------------------|------------------------------------------------|
| **Routes**       | Map URL + method to a chain: `authenticate` → `authorize(role)` → validators → `validate` → controller | Contain logic                                  |
| **Validators**   | `express-validator` chains per endpoint (body, params, query), normalization (trim, lowercase email)   | Touch the database                             |
| **Controllers**  | HTTP only: read `req`, call one service method, map result through a mapper, set status code, send JSON | Query the database or contain business rules   |
| **Services**     | Business rules, ownership checks, state transitions, **transaction boundaries** (`prisma.$transaction`) | Know about `req`/`res` or build queries        |
| **Repositories** | Prisma Client queries (raw SQL only for row locks). Return records with the DB's `snake_case` field names | Contain business rules                         |
| **Mappers**      | Turn repository records into response DTOs: `snake_case → camelCase`, hide internals (`password_hash`), format money | Perform I/O                                    |

### Dependency injection

There is no DI framework. `src/container.js` is the **composition root**: it creates the Prisma client, builds every
repository, injects repositories into service factories, and injects services into controller factories.
Every module is a factory function receiving its dependencies, e.g.:

```js
// src/services/order.service.js
export function createOrderService({ orderRepository, productRepository, cartRepository,
                                     addressRepository, paymentRepository, paymentService,
                                     prisma }) {
  return { checkout, pay, cancel, updateStatus, getById, list };
  // ...
}
```

### Transactions

Services own transactions through Prisma's interactive transactions:

```js
await prisma.$transaction(async (tx) => {
  const products = await productRepository.lockByIds(ids, tx); // SELECT ... FOR UPDATE via tx.$queryRaw
  await productRepository.decrementStock(items, tx);
  // ...
});
```

`prisma.$transaction` runs `BEGIN`, calls the callback with a transaction client `tx`, then commits, or rolls back
if the callback throws. **Every repository method accepts an optional last argument `db`** (defaults to the Prisma
client), so the same method works inside or outside a transaction: pass `tx` to run it inside one.

Prisma has no `SELECT ... FOR UPDATE`, so row locks are raw SQL through `tx.$queryRaw`. A lock only makes sense
inside a transaction, so lock methods (e.g. `userRepository.lockById(id, tx)`) take `tx` as a required argument.

### Query safety

- Prisma Client sends every value as a bound parameter. The few raw queries use the `$queryRaw` tagged template,
  which also turns `${…}` interpolations into parameters; `$queryRawUnsafe` is never used.
- Dynamic parts of queries (filters, `orderBy`) are built only from **whitelisted** maps. For example,
  `sort=-price` maps to `[{ price: 'desc' }, { id: 'asc' }]` through a fixed lookup table. Unknown values are
  rejected by validators.

### Error handling

- `src/errors/AppError.js` defines `AppError(statusCode, code, message, details)` and subclasses:
  `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `PaymentDeclinedError`.
- Services throw these; Express 5 forwards rejected promises from async handlers to `errorHandler.js` automatically.
- `errorHandler.js` also translates Prisma errors that slip through (`P2002` unique constraint → `409 CONFLICT`,
  `P2003` foreign key constraint → `409 CONFLICT`) and converts anything unknown into `500 INTERNAL_ERROR` without leaking
  stack traces (the stack is logged instead).

---

## Project structure

```
pc-parts-store/
├── src/
│   ├── server.js                    # entry point: starts HTTP server, graceful shutdown
│   ├── app.js                       # createApp(container): Express app, global middleware, routes, error handling
│   ├── container.js                 # composition root: Prisma client → repositories → services → controllers
│   ├── config/
│   │   └── index.js                 # reads + validates env vars, exports a frozen config object
│   ├── db/
│   │   └── prisma.js                # createPrismaClient(): PrismaClient on @prisma/adapter-pg, from DATABASE_URL
│   ├── generated/
│   │   └── prisma/                  # Prisma Client output of `prisma generate` (git-ignored)
│   ├── routes/
│   │   ├── index.js                 # mounts all routers under /api
│   │   ├── auth.routes.js
│   │   ├── me.routes.js
│   │   ├── users.routes.js
│   │   ├── categories.routes.js
│   │   ├── brands.routes.js
│   │   ├── products.routes.js
│   │   ├── reviews.routes.js
│   │   ├── cart.routes.js
│   │   └── orders.routes.js
│   ├── controllers/                 # auth, me, users, categories, brands, products, reviews, cart, orders, health
│   ├── services/                    # auth, user, address, category, brand, product, review, cart, order, payment
│   ├── repositories/                # user, address, category, brand, product, review, cart, order, payment
│   ├── mappers/                     # user, address, category, brand, product, review, cart, order, payment
│   ├── validators/                  # one file per resource with express-validator chains; shared rules in common.validators.js
│   ├── middleware/
│   │   ├── authenticate.js          # authenticate (required) + authenticateOptional
│   │   ├── authorize.js             # authorize(...roles)
│   │   ├── validate.js              # validationResult → ValidationError
│   │   ├── notFound.js
│   │   └── errorHandler.js
│   ├── errors/
│   │   └── AppError.js
│   ├── utils/
│   │   ├── jwt.js                   # sign / verify helpers
│   │   └── password.js              # hash / compare (bcryptjs)
│   └── docs/
│       └── openapi.yaml             # served at /api/docs
├── db/
│   └── init.sql                     # full schema (source of truth), run by Postgres on first start
├── prisma/
│   └── schema.prisma                # Prisma models, introspected from the database with `prisma db pull`
├── seeds/
│   ├── seed.js                      # idempotent: admin user + sample catalog
│   └── data/catalog.js              # categories, brands, ~20 products with specs
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── prisma.config.js                 # Prisma CLI config: schema path + DATABASE_URL
└── package.json
```

---

## Authentication & authorization

### Tokens

- **Access token only**: there are no refresh tokens. A user logs in again after the token expires.
- **Lifetime: exactly 1 hour** (`exp = iat + 3600`). This is a constant in `config/index.js`.
- Algorithm **HS256**, secret from `JWT_SECRET` (at least 32 characters; the app refuses to start otherwise).
  `jwt.verify` is always called with `algorithms: ['HS256']`.
- Claims:

  ```json
  {
    "sub": "42",
    "role": "customer",
    "iat": 1763640000,
    "exp": 1763643600
  }
  ```

- Tokens are **stateless**: the server stores nothing about issued tokens.
- Clients send it as `Authorization: Bearer <token>`.

Login response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Passwords

- Hashed with bcrypt (`bcryptjs`, cost factor 12).
- Validation: 8–72 characters (72 bytes is bcrypt's input limit).
- Unknown email and wrong password both return the same `401 INVALID_CREDENTIALS`, so attackers can't tell which emails are registered.

### The `authenticate` middleware

Runs on every protected request:

1. Read the `Authorization: Bearer <token>` header. If it is missing, return `401 UNAUTHORIZED`.
2. `jwt.verify(token)`. A bad signature or malformed token returns `401 INVALID_TOKEN`, and an expired token returns `401 TOKEN_EXPIRED`.
3. Load the user by `sub`. If the user doesn't exist, return `401 INVALID_TOKEN`. If `is_active = false`, return `403 ACCOUNT_DISABLED`.
4. Attach `req.user = { id, email, role }` (role is taken **from the database**, not from the token).

`authenticateOptional` runs the same checks only if an `Authorization` header is present. Otherwise the request
continues anonymously. Public catalog endpoints use it so admins can see inactive products.

`authorize(...roles)` returns `403 FORBIDDEN` when `req.user.role` is not in the allowed list. Ownership rules
(e.g. "a customer can only see their own orders") are enforced in **services**. Accessing someone else's resource
returns `404 NOT_FOUND` so the API doesn't reveal that the resource exists.

### Logout, password change and blocking

| Scenario                     | What happens                                                                                                       |
|------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **Logout**                   | Client-side only: the client discards its token. There is no logout endpoint. |
| **Password change**          | `PUT /api/me/password` verifies the current password and stores the new hash. |
| **Admin blocks a user**      | `PATCH /api/users/:id/status` sets `is_active = false`. Because `authenticate` loads the user on every request, **all** of that user's tokens stop working immediately (`403 ACCOUNT_DISABLED`), and login is refused. |

### Authorization matrix

| Area                                         | Public | Customer                    | Admin                          |
|----------------------------------------------|:------:|:---------------------------:|:------------------------------:|
| Health check, Swagger docs                   | ✅     | ✅                          | ✅                             |
| Register, login                              | ✅     | –                           | –                              |
| Own profile, change password                 | –      | ✅                          | ✅                             |
| Address book                                 | –      | ✅                          | –                              |
| Browse categories, brands, products, reviews | ✅     | ✅                          | ✅ (+ inactive products)       |
| Create / update / delete catalog items       | –      | –                           | ✅                             |
| Cart, checkout, pay                          | –      | ✅                          | –                              |
| Create / edit own review                     | –      | ✅ (verified buyer)         | –                              |
| Delete review                                | –      | own                         | any                            |
| View orders                                  | –      | own                         | all                            |
| Cancel order                                 | –      | own, `pending` only         | `pending` or `paid`            |
| Mark order shipped / delivered               | –      | –                           | ✅                             |
| List users, block / unblock users            | –      | –                           | ✅                             |

---

## Database

### Entity-relationship overview

```mermaid
erDiagram
    USERS ||--o{ ADDRESSES : owns
    USERS ||--o{ CART_ITEMS : has
    USERS ||--o{ ORDERS : places
    USERS ||--o{ REVIEWS : writes
    CATEGORIES ||--o{ PRODUCTS : groups
    BRANDS ||--o{ PRODUCTS : makes
    PRODUCTS ||--o{ CART_ITEMS : "added as"
    PRODUCTS ||--o{ ORDER_ITEMS : "sold as"
    PRODUCTS ||--o{ REVIEWS : receives
    ORDERS ||--|{ ORDER_ITEMS : contains
    ORDERS ||--o{ PAYMENTS : "paid via"
```

### Schema

Primary keys are `INTEGER GENERATED ALWAYS AS IDENTITY`. Money is `NUMERIC(10,2)`. All timestamps are `TIMESTAMPTZ`.
`updated_at` is set by Prisma Client: the column is marked `@updatedAt` in `prisma/schema.prisma`, so every Prisma
update sets it. There are no triggers, so a raw SQL `UPDATE` would have to set it itself.

```sql
CREATE TYPE user_role      AS ENUM ('customer', 'admin');
CREATE TYPE order_status   AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('succeeded', 'failed', 'refunded');

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,           -- stored lower-cased
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'customer',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          VARCHAR(50),                           -- e.g. "Home", "Office"
  recipient_name VARCHAR(200) NOT NULL,
  phone          VARCHAR(30)  NOT NULL,
  street         VARCHAR(255) NOT NULL,
  city           VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(20)  NOT NULL,
  country        CHAR(2)      NOT NULL DEFAULT 'PL',    -- ISO 3166-1 alpha-2
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_id_idx ON addresses (user_id);

CREATE TABLE categories (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id INTEGER       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  brand_id    INTEGER       NOT NULL REFERENCES brands(id)     ON DELETE RESTRICT,
  sku         VARCHAR(64)   NOT NULL UNIQUE,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  specs       JSONB         NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,      -- soft delete flag
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_brand_id_idx    ON products (brand_id);
CREATE INDEX products_specs_idx       ON products USING GIN (specs jsonb_path_ops);

CREATE TABLE cart_items (
  user_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL CHECK (quantity > 0),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE orders (
  id                      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 INTEGER       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                  order_status  NOT NULL DEFAULT 'pending',
  total_amount            NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  -- shipping address snapshot (copied from the address book at checkout)
  shipping_recipient_name VARCHAR(200)  NOT NULL,
  shipping_phone          VARCHAR(30)   NOT NULL,
  shipping_street         VARCHAR(255)  NOT NULL,
  shipping_city           VARCHAR(100)  NOT NULL,
  shipping_postal_code    VARCHAR(20)   NOT NULL,
  shipping_country        CHAR(2)       NOT NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX orders_status_idx  ON orders (status);

CREATE TABLE order_items (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     INTEGER       NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id   INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255)  NOT NULL,                  -- snapshot
  unit_price   NUMERIC(10,2) NOT NULL,                  -- snapshot
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  UNIQUE (order_id, product_id)
);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

CREATE TABLE payments (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id       INTEGER        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2)  NOT NULL,
  status         payment_status NOT NULL,
  card_last4     CHAR(4)        NOT NULL,               -- full card number is never stored
  failure_reason VARCHAR(100),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_id_idx ON payments (order_id);

CREATE TABLE reviews (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
```

### Prisma models

`prisma/schema.prisma` describes the same tables for Prisma Client. It was generated from the database with
`prisma db pull` (introspection), then `@updatedAt` was added by hand to the `updated_at` columns.

- Models keep the table and column names as they are (`users`, `password_hash`, …), so repositories return records
  with `snake_case` fields and the mappers still do the `snake_case → camelCase` conversion. Relation fields are named
  after the related table, e.g. `product.categories` and `product.brands`.
- Prisma does not model `CHECK` constraints (introspection marks those models with a `///` comment). They are
  enforced by PostgreSQL only.
- `JSONB` columns are Prisma `Json` fields; `NUMERIC` columns are Prisma `Decimal` fields (see [Money](#money)).
- The generator (`prisma-client`) writes the client to `src/generated/prisma` as TypeScript. `src/db/prisma.js`
  imports `client.ts` directly and Node 24 runs it with its built-in type stripping, so there is no compile step.
- `prisma.config.js` configures the Prisma CLI. It reads `DATABASE_URL` from the environment because Prisma 7 does
  not load `.env` by itself; `prisma generate` doesn't need a database, so it also works without it.

### Schema initialization

- There are no migrations, and Prisma Migrate is not used. `db/init.sql` is the source of truth for the schema.
- Docker Compose mounts it into the `db` container's `/docker-entrypoint-initdb.d/`. The official Postgres image
  runs it **only when the data directory is empty**, i.e. on the first start of a fresh `pgdata` volume.
- To change the schema:
  1. Edit `db/init.sql` and recreate the database with `docker compose down -v`. All data is lost.
  2. Run `npx prisma db pull` against the recreated database, and check that the diff keeps the hand-added
     `@updatedAt` attributes. The `db` container publishes port 5432 on `127.0.0.1` only, so from your machine:

     ```bash
     DATABASE_URL=postgres://pcshop:pcshop@localhost:5432/pcshop npx prisma db pull
     ```
  3. Run `npx prisma generate` to regenerate the client locally (the Docker build does this itself).

### Money

- Stored as `NUMERIC(10,2)`. Prisma returns `NUMERIC` values as `Decimal` objects, which are exact. Repositories turn
  them into strings with `toFixed(2)` (a `Decimal` would serialize as `"2199"`), and the API keeps money as strings
  (`"2199.00"`) so precision is never lost to JavaScript floats.
- All monetary arithmetic (line totals, order totals, cart totals) is done **in the database** or with `Decimal`
  methods, never with JavaScript numbers.
- The shop uses a single currency, **PLN**. Every DTO that contains money also includes `"currency": "PLN"`.

---

## Business rules

### Catalog

- **Specs** are a flat JSON object of `string | number | boolean` values (max 30 keys), validated in
  `validators/products.validators.js`. Recommended keys per category:

  | Category    | Example specs                                                                                    |
  |-------------|--------------------------------------------------------------------------------------------------|
  | CPU         | `socket`, `cores`, `threads`, `baseClockGhz`, `boostClockGhz`, `tdpW`                            |
  | GPU         | `chipset`, `vramGb`, `memoryType`, `lengthMm`, `tdpW`                                            |
  | RAM         | `type`, `capacityGb`, `modules`, `speedMts`, `casLatency`                                        |
  | Motherboard | `socket`, `chipset`, `formFactor`, `memoryType`, `memorySlots`                                   |
  | PSU         | `wattage`, `efficiency`, `modular`                                                               |
  | Storage     | `type`, `capacityGb`, `interface`, `readMbs`, `writeMbs`                                         |
  | Case        | `formFactor`, `maxGpuLengthMm`, `color`                                                          |

- **Soft delete**: `DELETE /api/products/:id` sets `is_active = false`. Inactive products are hidden from public
  listings (404 on detail), but they stay referenced by past orders, carts and reviews. Admins can list them with
  `includeInactive=true` and reactivate them with `PATCH { "isActive": true }`.
- **Categories and brands** are hard-deleted, but only when no product (active or inactive) references them.
  Otherwise the API returns `409 CONFLICT`.
- A product's average rating and review count come from one `reviews.groupBy` query (sum and count per product) for
  all products being returned. The average is rounded to 2 decimals and is `null` when there are no reviews.

### Cart

- One cart per customer, stored in `cart_items`.
- `PUT /api/cart/items/:id` (`id` is the product id) sets the quantity of a product (adds it if absent). The product must be active,
  `1 ≤ quantity ≤ 99`, and `quantity ≤ current stock` (else `409 INSUFFICIENT_STOCK`).
- Adding to the cart **does not reserve stock**. Stock is checked again, strictly, at checkout.
- `GET /api/cart` returns current prices, line totals, the cart total and an `available` flag per item
  (false if the product became inactive or stock dropped below the quantity).

### Checkout (`POST /api/orders`)

Everything below runs in **one transaction**:

1. The address (`addressId`) must belong to the customer, or the API returns `404`.
2. Load the cart. If it is empty, return `409 CART_EMPTY`.
3. Lock the involved product rows **in id order** to avoid deadlocks, with raw SQL through `tx.$queryRaw`:
   `SELECT id, name, price, stock, is_active FROM products WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`.
4. If any product is inactive, return `409 PRODUCT_UNAVAILABLE`. If any quantity exceeds stock, return
   `409 INSUFFICIENT_STOCK`. In both cases `details` lists the offending product ids.
5. Decrement stock for every item.
6. Insert the order with the **shipping address snapshot**, insert `order_items` with **name and price snapshots**,
   and compute `total_amount` from the locked prices with `Decimal` methods.
7. Clear the cart.
8. `COMMIT` and respond `201` with the order.

### Order lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : checkout
    pending --> pending : pay (declined)
    pending --> paid : pay (approved)
    pending --> cancelled : cancel (customer or admin)
    paid --> shipped : admin
    paid --> cancelled : cancel (admin, payment refunded)
    shipped --> delivered : admin
    delivered --> [*]
    cancelled --> [*]
```

- Any transition not shown returns `409 INVALID_ORDER_STATE`.
- Every state change locks the order row (`SELECT ... FOR UPDATE`) inside a transaction.
- **Cancel** restores the stock of all order items. When an admin cancels a `paid` order, its succeeded payment is
  marked `refunded` (simulated refund).

### Mock payment (`POST /api/orders/:id/pay`)

- Body: `{ "cardNumber": "4111111111111111" }`, which must be 12–19 digits. Only the **last 4 digits** are stored,
  and the number is never logged.
- The order must belong to the customer and be `pending`.
- `payment.service.js` simulates a provider: a payment is approved when `random() < MOCK_PAYMENT_SUCCESS_RATE`
  (default `0.8`). `random` is injected (defaults to `Math.random`).
- Every attempt inserts a `payments` row (`succeeded` or `failed` with `failure_reason = 'CARD_DECLINED'`).
- **Approved**: the order becomes `paid`, and the response is `200` with the order.
- **Declined**: the failed attempt is committed and the order **stays `pending`**. The response is `402 PAYMENT_DECLINED`.
  The customer can retry as many times as they like.

### Reviews

- Only **verified buyers** may review. The customer needs at least one `delivered` order containing the product,
  otherwise the API returns `403 REVIEW_NOT_ALLOWED`.
- One review per product per customer. A second review returns `409 ALREADY_REVIEWED`.
- Authors can edit or delete their own reviews. Admins can delete any review.

### Users

- Registration always creates a `customer`. The only admin account is created by the seed script from env vars.
- Admins can block or unblock users (`isActive`). An admin cannot block themselves (`409 CONFLICT`).

---

## API reference

Interactive documentation: **`http://localhost:3000/api/docs`** (Swagger UI, supports the `Bearer` token via
"Authorize").

### Conventions

- Base path: **`/api`**. JSON in, JSON out. Field names are `camelCase`.
- Auth header: `Authorization: Bearer <accessToken>`.
- **Pagination** (all list endpoints except `GET /api/me/addresses`): `?page=1&limit=20` (`limit` defaults to `5`, max `20`). Response shape:

  ```json
  {
    "data": [ ... ],
    "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
  }
  ```

- **Errors** always have this shape:

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Request validation failed",
      "details": [
        { "field": "email", "location": "body", "message": "Must be a valid email" }
      ]
    }
  }
  ```

### Error codes

| HTTP | Codes                                                                                                                        |
|------|------------------------------------------------------------------------------------------------------------------------------|
| 400  | `VALIDATION_ERROR`                                                                                                           |
| 401  | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_TOKEN`, `TOKEN_EXPIRED`                                                      |
| 402  | `PAYMENT_DECLINED`                                                                                                           |
| 403  | `FORBIDDEN`, `ACCOUNT_DISABLED`, `REVIEW_NOT_ALLOWED`                                                                        |
| 404  | `NOT_FOUND`                                                                                                                  |
| 409  | `CONFLICT`, `EMAIL_TAKEN`, `ADDRESS_LIMIT_REACHED`, `CART_EMPTY`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE`, `INVALID_ORDER_STATE`, `ALREADY_REVIEWED` |
| 500  | `INTERNAL_ERROR`                                                                                                             |

### Endpoints

#### System

| Method | Path          | Access | Description                                        |
|--------|---------------|--------|----------------------------------------------------|
| GET    | `/api/health` | Public | `200 { "status": "ok", "db": "up" }` or `503`      |
| GET    | `/api/docs`   | Public | Swagger UI                                         |

#### Auth

| Method | Path                 | Access        | Body                                               | Response                    |
|--------|----------------------|---------------|----------------------------------------------------|-----------------------------|
| POST   | `/api/auth/register` | Public        | `{ email, password, firstName, lastName }`         | `201` user                  |
| POST   | `/api/auth/login`    | Public        | `{ email, password }`                              | `200 { accessToken, tokenType, expiresIn }` |

#### Me

| Method | Path                       | Access        | Description                                                        |
|--------|----------------------------|---------------|--------------------------------------------------------------------|
| GET    | `/api/me`                  | Authenticated | Own profile                                                        |
| PATCH  | `/api/me`                  | Authenticated | Update `firstName`, `lastName`                                     |
| PUT    | `/api/me/password`         | Authenticated | `{ currentPassword, newPassword }`, `204`                          |
| GET    | `/api/me/addresses`        | Customer      | List own addresses (plain array, not paginated: at most 3)         |
| POST   | `/api/me/addresses`        | Customer      | `{ label?, recipientName, phone, street, city, postalCode, country? }`, `201`; a 4th address returns `409 ADDRESS_LIMIT_REACHED` |
| PATCH  | `/api/me/addresses/:id`    | Customer      | Update own address; only fields present change, `label: null` clears it |
| DELETE | `/api/me/addresses/:id`    | Customer      | Delete own address (orders keep their snapshot)                    |

#### Users (admin)

| Method | Path                    | Access | Description                                          |
|--------|-------------------------|--------|------------------------------------------------------|
| GET    | `/api/users`            | Admin  | Paginated list; filters `role`, `isActive`           |
| GET    | `/api/users/:id`        | Admin  | User details                                         |
| PATCH  | `/api/users/:id/status` | Admin  | `{ isActive: boolean }`: block or unblock a user     |

#### Categories & brands

| Method | Path                  | Access | Description                                      |
|--------|-----------------------|--------|--------------------------------------------------|
| GET    | `/api/categories`     | Public | Paginated list, ordered by id                    |
| GET    | `/api/categories/:id` | Public | Category details                                 |
| POST   | `/api/categories`     | Admin  | `{ name, slug, description? }`                   |
| PATCH  | `/api/categories/:id` | Admin  | Partial update                                   |
| DELETE | `/api/categories/:id` | Admin  | `204`, or `409 CONFLICT` while products use it    |
| GET    | `/api/brands`         | Public | Paginated list, ordered by id                    |
| GET    | `/api/brands/:id`     | Public | Brand details                                    |
| POST   | `/api/brands`         | Admin  | `{ name }`                                       |
| PATCH  | `/api/brands/:id`     | Admin  | Partial update                                   |
| DELETE | `/api/brands/:id`     | Admin  | `204`, or `409 CONFLICT` while products use it    |

#### Products

| Method | Path                | Access                  | Description                                                    |
|--------|---------------------|-------------------------|----------------------------------------------------------------|
| GET    | `/api/products`     | Public (optional auth)  | Paginated, filtered, sorted list                               |
| GET    | `/api/products/:id` | Public (optional auth)  | Product details (inactive → `404` unless admin)                |
| POST   | `/api/products`     | Admin                   | `{ categoryId, brandId, sku, name, description?, price, stock, specs? }` |
| PATCH  | `/api/products/:id` | Admin                   | Partial update, including `stock` and `isActive`               |
| DELETE | `/api/products/:id` | Admin                   | Soft delete (`isActive = false`), `204`                        |

Query parameters for `GET /api/products`:

| Param             | Example                     | Notes                                                                      |
|-------------------|-----------------------------|----------------------------------------------------------------------------|
| `page`, `limit`   | `page=2&limit=20`           | Pagination                                                                 |
| `categoryId`      | `categoryId=1`              |                                                                            |
| `brandId`         | `brandId=3`                 |                                                                            |
| `minPrice`        | `minPrice=500`              | Decimal, compared as `NUMERIC` in SQL                                      |
| `maxPrice`        | `maxPrice=1500.50`          |                                                                            |
| `inStock`         | `inStock=true`              | `stock > 0`                                                                |
| `specs[<key>]`    | `specs[socket]=AM5`         | Exact match per key via Prisma's JSON path filter (`{ specs: { path: [key], equals: value } }`). Numeric-looking values are matched as numbers, `true`/`false` as booleans. Requires `app.set('query parser', 'extended')`. |
| `sort`            | `sort=-price`               | One of `price`, `-price`, `name`, `-name`, `createdAt`, `-createdAt` (default `-createdAt`) |
| `includeInactive` | `includeInactive=true`      | Admin only, ignored for others                                             |

Example product:

```json
{
  "id": 12,
  "sku": "CPU-AMD-R7-9800X3D",
  "name": "AMD Ryzen 7 9800X3D",
  "description": "8-core desktop processor with 3D V-Cache",
  "price": "2199.00",
  "currency": "PLN",
  "stock": 14,
  "isActive": true,
  "category": { "id": 1, "name": "CPU", "slug": "cpu" },
  "brand": { "id": 1, "name": "AMD" },
  "specs": { "socket": "AM5", "cores": 8, "threads": 16, "baseClockGhz": 4.7, "boostClockGhz": 5.2, "tdpW": 120 },
  "rating": { "average": 4.67, "count": 3 },
  "createdAt": "2026-11-20T10:00:00.000Z",
  "updatedAt": "2026-11-20T10:00:00.000Z"
}
```

#### Reviews

| Method | Path                         | Access             | Description                                   |
|--------|------------------------------|--------------------|-----------------------------------------------|
| GET    | `/api/products/:id/reviews`  | Public             | Paginated reviews, newest first               |
| POST   | `/api/products/:id/reviews`  | Customer           | `{ rating: 1-5, comment? }` (verified buyer)  |
| PATCH  | `/api/reviews/:id`           | Customer (author)  | Update `rating` / `comment`                   |
| DELETE | `/api/reviews/:id`           | Author or admin    | `204`                                         |

#### Cart

| Method | Path                         | Access   | Description                             |
|--------|------------------------------|----------|-----------------------------------------|
| GET    | `/api/cart`                  | Customer | Cart with line totals and total         |
| PUT    | `/api/cart/items/:id`        | Customer | `{ quantity }`: add or set quantity (`id` = product id) |
| DELETE | `/api/cart/items/:id`        | Customer | Remove one product (`id` = product id)  |
| DELETE | `/api/cart`                  | Customer | Clear the cart                          |

Example cart:

```json
{
  "items": [
    {
      "product": { "id": 12, "name": "AMD Ryzen 7 9800X3D", "price": "2199.00", "stock": 14, "isActive": true },
      "quantity": 1,
      "lineTotal": "2199.00",
      "available": true
    }
  ],
  "total": "2199.00",
  "currency": "PLN"
}
```

#### Orders

| Method | Path                     | Access                 | Description                                                      |
|--------|--------------------------|------------------------|------------------------------------------------------------------|
| POST   | `/api/orders`            | Customer               | `{ addressId }`: checkout from the cart, `201`                   |
| GET    | `/api/orders`            | Customer / Admin       | Customer: own orders. Admin: all orders. Filters `status`, `userId` (admin only) |
| GET    | `/api/orders/:id`        | Owner / Admin          | Order with items, shipping address and payment attempts          |
| POST   | `/api/orders/:id/pay`    | Customer (owner)       | `{ cardNumber }`: `200` paid or `402 PAYMENT_DECLINED`           |
| POST   | `/api/orders/:id/cancel` | Owner (pending) / Admin (pending, paid) | Cancel and restore stock                        |
| PATCH  | `/api/orders/:id/status` | Admin                  | `{ status: "shipped" \| "delivered" }`                           |

### Example flow (curl)

```bash
# login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jan@example.com","password":"Secret123!"}' | jq -r .accessToken)

# add a product to the cart
curl -X PUT http://localhost:3000/api/cart/items/12 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"quantity":1}'

# checkout
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"addressId":1}'

# pay (may randomly be declined; just retry)
curl -X POST http://localhost:3000/api/orders/1/pay \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"cardNumber":"4111111111111111"}'
```

---

## Configuration

All configuration comes from environment variables, loaded by Docker Compose from `.env`.
`.env.example` is committed, and `.env` is git-ignored. `src/config/index.js` validates them at startup and exits with a
clear message if something required is missing.

| Variable                    | Example / default                               | Description                                           |
|-----------------------------|-------------------------------------------------|-------------------------------------------------------|
| `NODE_ENV`                  | `production`                                    |                                                       |
| `PORT`                      | `3000`                                          | Port the API listens on inside the container          |
| `POSTGRES_USER`             | `pcshop`                                        | Used by the `db` container                            |
| `POSTGRES_PASSWORD`         | `pcshop`                                        | Used by the `db` container                            |
| `POSTGRES_DB`               | `pcshop`                                        | Used by the `db` container                            |
| `DATABASE_URL`              | `postgres://pcshop:pcshop@db:5432/pcshop`       | Used by the API and the Prisma CLI (`prisma.config.js`) |
| `JWT_SECRET`                | *(required)*                                    | HS256 secret, at least 32 characters                  |
| `MOCK_PAYMENT_SUCCESS_RATE` | `0.8`                                           | Probability (0–1) that a mock payment is approved     |
| `ADMIN_EMAIL`               | `admin@pcshop.local`                            | Seeded admin account                                  |
| `ADMIN_PASSWORD`            | *(required)*                                    | Seeded admin password                                 |

Fixed constants (in `config/index.js`, not env): token lifetime `3600 s`, bcrypt cost `12`, currency `PLN`,
pagination default/max `5`/`20`, at most `3` addresses per customer, at most `99` of one product in the cart.

---

## Running with Docker

### Prerequisites

- Docker with Docker Compose v2.
- *(Optional)* Node.js 24 locally, only for dev tooling (the Prisma CLI).
  The system itself runs entirely in containers. The generated Prisma Client is git-ignored, so run
  `npx prisma generate` after `npm install` before running code locally.

### Services

`docker-compose.yml` defines two services:

```yaml
services:
  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "127.0.0.1:5432:5432"   # reachable from this machine only, for the Prisma CLI and psql
    volumes:
      - pgdata:/var/lib/postgresql
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build: .
    # Seeds the admin account and sample catalog (idempotent), then starts the server.
    # `exec` makes Node PID 1 so it receives SIGTERM directly.
    command: ["sh", "-c", "node seeds/seed.js && exec node src/server.js"]
    restart: unless-stopped
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 15s

volumes:
  pgdata:
```

### Image and startup

- `Dockerfile` is a two-stage build on `node:24-alpine`:
  - **build** stage: `npm ci` (including the `prisma` dev dependency), then `npx prisma generate` writes Prisma Client
    to `src/generated/prisma`. No database is needed for this.
  - **runtime** stage: `npm ci --omit=dev --omit=optional`, copies the source and the generated client from the build
    stage, runs as the non-root `node` user and exposes port `3000`. The Prisma CLI is not in the final image.
- `src/generated` is listed in `.dockerignore`, so a local (possibly stale) client never ends up in the image.
- The image's `CMD` is `["node", "src/server.js"]`. Compose overrides it with
  `sh -c "node seeds/seed.js && exec node src/server.js"`: the seed runs first, then `exec` replaces the shell with
  Node. Node is PID 1, so it receives `SIGTERM` from `docker compose stop` and shuts down gracefully
  (close HTTP server → `prisma.$disconnect()`).
- If the seed fails (e.g. a missing `ADMIN_PASSWORD`), the server is not started. The container exits and is
  restarted by `restart: unless-stopped`, so the error repeats in `docker compose logs api` until it is fixed.
- The database schema is created by the `db` container itself (see [Schema initialization](#schema-initialization)).

### Quick start

```bash
cp .env.example .env          # then set JWT_SECRET and ADMIN_PASSWORD
docker compose up --build -d  # creates the schema, seeds the admin + catalog, starts the API
docker compose logs -f api    # starts with what the seed created or skipped
```

- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs
- Log in as the seeded admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Useful commands

```bash
docker compose exec db psql -U pcshop -d pcshop         # open a psql shell
docker compose down                                     # stop (data kept in the pgdata volume)
docker compose down -v                                  # stop and wipe the database (re-runs db/init.sql next start)
```

---

## Seed data

`seeds/seed.js` runs automatically every time the `api` container starts, before the server. It is **idempotent** and
runs in a single Prisma transaction (`prisma.$transaction`), so it can also be re-run by hand with `docker compose exec api npm run seed`:

- **Admin**: created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no user with that email exists.
- **Sample catalog**: inserted only when the `products` table is empty:
  - Categories: CPU, GPU, RAM, Motherboard, PSU, Storage, Case.
  - Brands: AMD, Intel, ASUS, MSI, Gigabyte, Corsair, Kingston, Samsung, Western Digital, Seasonic, be quiet!,
    Fractal Design, NZXT.
  - About 20 products with realistic specs, prices in PLN and stock levels.

---

## Health

`GET /api/health` runs `SELECT 1` through Prisma (`prisma.$queryRaw`). It returns `200 { "status": "ok", "db": "up" }`, or
`503 { "status": "error", "db": "down" }`. Docker uses it as the `api` container healthcheck.

---

## npm scripts

| Script                  | Command                                                     |
|-------------------------|-------------------------------------------------------------|
| `npm start`             | `node src/server.js`                                        |
| `npm run seed`          | `node seeds/seed.js`                                        |

---

## Known limitations & trade-offs

- **No refresh tokens**: users log in again every hour.
- **No server-side logout or token revocation**: a token stays valid until it expires (at most 1 hour), even after
  the client logs out or the password is changed. Blocking a user, in contrast, takes effect immediately.
- **One DB lookup per authenticated request** (user status and role). This is a cheap primary-key lookup, and it is
  what makes blocking and role changes take effect immediately.
- **No rate limiting**: login and registration are not throttled, so password guessing is only slowed by bcrypt.
- **No migrations**: schema changes require recreating the database (`docker compose down -v`) and re-introspecting
  `prisma/schema.prisma` with `prisma db pull`.
- **Spec filters don't use the GIN index**: Prisma's JSON path filter does not compile to `@>`, the operator the
  `jsonb_path_ops` index serves, so filtering by `specs[...]` scans the matching products.
- **Payments are simulated**: there is no real provider, webhooks or idempotency keys.
- **Cart does not reserve stock**: availability is guaranteed only at checkout.
- **Single currency (PLN)** and no tax or shipping-cost calculation.
- **No product images and no text search**: products are found with structured filters only.
