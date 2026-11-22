export function createBrandRepository({ prisma }) {
  async function findById(id, db = prisma) {
    return db.brands.findUnique({ where: { id } });
  }

  async function list({ limit, offset }, db = prisma) {
    return db.brands.findMany({ orderBy: { id: 'asc' }, skip: offset, take: limit });
  }

  async function count(db = prisma) {
    return db.brands.count();
  }

  return { findById, list, count };
}
