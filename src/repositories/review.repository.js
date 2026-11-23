export function createReviewRepository({ prisma }) {
  // Returns null instead of throwing when the user has already reviewed the product.
  // skipDuplicates makes this INSERT ... ON CONFLICT DO NOTHING RETURNING, so a duplicate returns no row.
  async function create(productId, userId, { rating, comment }, db = prisma) {
    const [review] = await db.reviews.createManyAndReturn({
      data: [{ product_id: productId, user_id: userId, rating, comment }],
      skipDuplicates: true,
    });
    return review ?? null;
  }

  // Newest first.
  async function listByProduct(productId, { limit, offset }, db = prisma) {
    return db.reviews.findMany({ where: { product_id: productId }, orderBy: { id: 'desc' }, skip: offset, take: limit });
  }

  async function countByProduct(productId, db = prisma) {
    return db.reviews.count({ where: { product_id: productId } });
  }

  // Fields left undefined keep their current value; comment may also be set to null to clear it.
  // Returns null when the review doesn't exist or belongs to another user.
  // updateManyAndReturn can filter on user_id and returns no row on a miss, where update() would throw.
  async function update(id, userId, { rating, comment }, db = prisma) {
    const [review] = await db.reviews.updateManyAndReturn({ where: { id, user_id: userId }, data: { rating, comment } });
    return review ?? null;
  }

  // Prisma ignores undefined values, so an undefined userId matches a review by any user.
  // Returns false when no review matches.
  async function remove(id, userId, db = prisma) {
    const { count } = await db.reviews.deleteMany({ where: { id, user_id: userId } });
    return count > 0;
  }

  return { create, listByProduct, countByProduct, update, remove };
}
