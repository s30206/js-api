import { ConflictError, NotFoundError } from '../errors/AppError.js';

export function createCategoryService({ categoryRepository }) {
  async function list({ page, limit }) {
    const [categories, total] = await Promise.all([
      categoryRepository.list({ limit, offset: (page - 1) * limit }),
      categoryRepository.count(),
    ]);
    return { categories, total };
  }

  async function getById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  // The unique constraints on name and slug are what reject duplicates, so concurrent requests can't both succeed.
  async function create({ name, slug, description }) {
    try {
      return await categoryRepository.create({ name, slug, description });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictError('CATEGORY_EXISTS', 'A category with this name or slug already exists');
      }
      throw error;
    }
  }

  async function update(id, { name, slug, description }) {
    let category;
    try {
      category = await categoryRepository.update(id, { name, slug, description });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictError('CATEGORY_EXISTS', 'A category with this name or slug already exists');
      }
      throw error;
    }
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  // Only unused categories can be deleted. The database enforces that (see categoryRepository.remove),
  // which, unlike a check before the delete, can't be raced by a product being added in between.
  async function remove(id) {
    let deleted;
    try {
      deleted = await categoryRepository.remove(id);
    } catch (error) {
      if (error.code === 'P2003') throw new ConflictError('CATEGORY_IN_USE', 'Category is still used by products');
      throw error;
    }
    if (!deleted) throw new NotFoundError('Category not found');
  }

  return { list, getById, create, update, remove };
}
