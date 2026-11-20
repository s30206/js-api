-- Run once by the postgres image (/docker-entrypoint-initdb.d) when the data directory is empty.
-- To apply changes, recreate the database: docker compose down -v

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
