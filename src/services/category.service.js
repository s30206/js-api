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
    const category = await categoryRepository.create({ name, slug, description });
    if (!category) throw new ConflictError('CONFLICT', 'A category with this name or slug already exists');
    return category;
  }

  async function update(id, { name, slug, description }) {
    const category = await categoryRepository.update(id, { name, slug, description });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  // Only unused categories can be deleted. The database enforces that (see categoryRepository.remove),
  // which, unlike a check before the delete, can't be raced by a product being added in between.
  async function remove(id) {
    if (!(await categoryRepository.remove(id))) throw new NotFoundError('Category not found');
  }

  return { list, getById, create, update, remove };
}
