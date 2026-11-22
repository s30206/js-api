import { NotFoundError } from '../errors/AppError.js';

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

  return { list, getById };
}
