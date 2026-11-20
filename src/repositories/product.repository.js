// Joins the category and brand, and aggregates the product's reviews into rating_average / rating_count.
// The lateral aggregate always yields one row: rating_average is null and rating_count 0 without reviews.
const SELECT_PRODUCT = `SELECT p.*,
              c.name AS category_name,
              c.slug AS category_slug,
              b.name AS brand_name,
              r.rating_average,
              r.rating_count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN brands b     ON b.id = p.brand_id
       CROSS JOIN LATERAL (
         SELECT round(avg(rating), 2)::float8 AS rating_average, count(*)::int AS rating_count
         FROM reviews
         WHERE product_id = p.id
       ) r`;

// Shared by list() and count(). $1-$6 are filters where null skips the filter; $7 = true hides inactive products.
const LIST_FILTERS = `WHERE ($1::int IS NULL OR p.category_id = $1)
         AND ($2::int IS NULL OR p.brand_id = $2)
         AND ($3::numeric IS NULL OR p.price >= $3)
         AND ($4::numeric IS NULL OR p.price <= $4)
         AND ($5::boolean IS NULL OR (p.stock > 0) = $5)
         AND ($6::jsonb IS NULL OR p.specs @> $6)
         AND (p.is_active OR NOT $7::boolean)`;

// Whitelist for ORDER BY; the id tie-breaker keeps pagination stable when values repeat.
const ORDER_BY = {
  price: 'p.price, p.id',
  '-price': 'p.price DESC, p.id',
  name: 'p.name, p.id',
  '-name': 'p.name DESC, p.id',
  createdAt: 'p.created_at, p.id',
  '-createdAt': 'p.created_at DESC, p.id DESC',
};

function filterParams({ categoryId, brandId, minPrice, maxPrice, inStock, specs, activeOnly }) {
  return [
    categoryId ?? null,
    brandId ?? null,
    minPrice ?? null,
    maxPrice ?? null,
    inStock ?? null,
    specs ? JSON.stringify(specs) : null,
    activeOnly,
  ];
}

export function createProductRepository({ pool }) {
  async function findById(id, db = pool) {
    const { rows } = await db.query(`${SELECT_PRODUCT} WHERE p.id = $1`, [id]);
    return rows[0] ?? null;
  }

  // Filters left undefined match every product; sort must be a key of ORDER_BY.
  async function list(filters, { sort, limit, offset }, db = pool) {
    const { rows } = await db.query(
      `${SELECT_PRODUCT}
       ${LIST_FILTERS}
       ORDER BY ${ORDER_BY[sort]}
       LIMIT $8 OFFSET $9`,
      [...filterParams(filters), limit, offset],
    );
    return rows;
  }

  async function count(filters, db = pool) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS count FROM products p ${LIST_FILTERS}`,
      filterParams(filters),
    );
    return rows[0].count;
  }

  return { findById, list, count };
}
