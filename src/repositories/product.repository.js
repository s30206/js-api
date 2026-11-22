// Every product is returned with its category and brand, plus rating_average / rating_count from its reviews.
const INCLUDE = {
  categories: { select: { name: true, slug: true } },
  brands: { select: { name: true } },
};

// Whitelist for orderBy; the id tie-breaker keeps pagination stable when values repeat.
const ORDER_BY = {
  price: [{ price: 'asc' }, { id: 'asc' }],
  '-price': [{ price: 'desc' }, { id: 'asc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
  '-name': [{ name: 'desc' }, { id: 'asc' }],
  createdAt: [{ created_at: 'asc' }, { id: 'asc' }],
  '-createdAt': [{ created_at: 'desc' }, { id: 'desc' }],
};

// Shared by list() and count(). Prisma ignores undefined values, so filters left undefined match every product.
function listWhere({ categoryId, brandId, minPrice, maxPrice, inStock, specs, activeOnly }) {
  return {
    category_id: categoryId,
    brand_id: brandId,
    price: { gte: minPrice, lte: maxPrice },
    stock: inStock === undefined ? undefined : inStock ? { gt: 0 } : { lte: 0 },
    is_active: activeOnly ? true : undefined,
    // Spec values are scalars (see products.validators.js), so matching each key equals the old specs @> filter.
    AND: Object.entries(specs ?? {}).map(([key, value]) => ({ specs: { path: [key], equals: value } })),
  };
}

// Flattens a product into the row shape the mapper expects. ratingGroup is undefined when it has no reviews.
// toFixed(2) keeps price a NUMERIC(10,2) string ('2199.00'); a Prisma Decimal would serialize as '2199'.
// The average is rounded from the exact sum / count rather than a float average, so it matches PostgreSQL's round().
function toRow({ categories, brands, price, ...product }, ratingGroup) {
  return {
    ...product,
    price: price.toFixed(2),
    category_name: categories.name,
    category_slug: categories.slug,
    brand_name: brands.name,
    rating_average: ratingGroup ? Math.round((ratingGroup._sum.rating * 100) / ratingGroup._count._all) / 100 : null,
    rating_count: ratingGroup?._count._all ?? 0,
  };
}

export function createProductRepository({ prisma }) {
  async function withRatings(products, db) {
    const groups = await db.reviews.groupBy({
      by: ['product_id'],
      where: { product_id: { in: products.map((p) => p.id) } },
      _sum: { rating: true },
      _count: { _all: true },
    });
    const groupsById = new Map(groups.map((group) => [group.product_id, group]));
    return products.map((product) => toRow(product, groupsById.get(product.id)));
  }

  async function findById(id, db = prisma) {
    const product = await db.products.findUnique({ where: { id }, include: INCLUDE });
    if (!product) return null;
    const [row] = await withRatings([product], db);
    return row;
  }

  // sort must be a key of ORDER_BY.
  async function list(filters, { sort, limit, offset }, db = prisma) {
    const products = await db.products.findMany({
      where: listWhere(filters),
      include: INCLUDE,
      orderBy: ORDER_BY[sort],
      skip: offset,
      take: limit,
    });
    return withRatings(products, db);
  }

  async function count(filters, db = prisma) {
    return db.products.count({ where: listWhere(filters) });
  }

  // Row locks held until the surrounding transaction ends. Rows are locked in id order, so two transactions
  // locking overlapping sets can't deadlock. Raw SQL because Prisma has no FOR UPDATE; tx must be the client
  // from prisma.$transaction(). price comes back as a Prisma Decimal.
  async function lockByIds(ids, tx) {
    return tx.$queryRaw`SELECT id, name, price, stock, is_active FROM products WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
  }

  // items are { productId, quantity }. The CHECK (stock >= 0) constraint rejects a decrement below zero.
  async function decrementStock(items, db = prisma) {
    for (const { productId, quantity } of items) {
      await db.products.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
    }
  }

  // items are { productId, quantity }.
  async function incrementStock(items, db = prisma) {
    for (const { productId, quantity } of items) {
      await db.products.update({ where: { id: productId }, data: { stock: { increment: quantity } } });
    }
  }

  return { findById, list, count, lockByIds, decrementStock, incrementStock };
}
