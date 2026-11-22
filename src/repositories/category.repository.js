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

  return { findById, list, count };
}
