export function createCategoryRepository({ prisma }) {
  async function findById(id, db = prisma) {
    return db.categories.findUnique({ where: { id } });
  }

  async function list({ limit, offset }, db = prisma) {
    return db.categories.findMany({ orderBy: { id: 'asc' }, skip: offset, take: limit });
  }

  async function count(db = prisma) {
    return db.categories.count();
  }

  // Returns false when the category doesn't exist. While any product references it, the database refuses
  // (products.category_id is ON DELETE RESTRICT) and Prisma throws an error with code P2003.
  async function remove(id, db = prisma) {
    const { count } = await db.categories.deleteMany({ where: { id } });
    return count > 0;
  }

  return { findById, list, count, remove };
}
