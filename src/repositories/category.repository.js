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

  // A duplicate name or slug makes Prisma throw an error with code P2002.
  async function create({ name, slug, description }, db = prisma) {
    return db.categories.create({ data: { name, slug, description } });
  }

  // Fields left undefined keep their current value; description may also be set to null to clear it.
  // Returns null when the category doesn't exist. updateManyAndReturn returns no row on a miss, where update() would throw.
  async function update(id, { name, slug, description }, db = prisma) {
    const [category] = await db.categories.updateManyAndReturn({ where: { id }, data: { name, slug, description } });
    return category ?? null;
  }

  // Returns false when the category doesn't exist. While any product references it, the database refuses
  // (products.category_id is ON DELETE RESTRICT) and Prisma throws an error with code P2003.
  async function remove(id, db = prisma) {
    const { count } = await db.categories.deleteMany({ where: { id } });
    return count > 0;
  }

  return { findById, list, count, create, update, remove };
}
