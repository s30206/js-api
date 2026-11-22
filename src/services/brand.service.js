import { ConflictError, NotFoundError } from '../errors/AppError.js';

export function createBrandService({ brandRepository }) {
  async function list({ page, limit }) {
    const [brands, total] = await Promise.all([
      brandRepository.list({ limit, offset: (page - 1) * limit }),
      brandRepository.count(),
    ]);
    return { brands, total };
  }

  async function getById(id) {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  // Only unused brands can be deleted. The database enforces that (see brandRepository.remove),
  // which, unlike a check before the delete, can't be raced by a product being added in between.
  async function remove(id) {
    let deleted;
    try {
      deleted = await brandRepository.remove(id);
    } catch (error) {
      if (error.code === 'P2003') throw new ConflictError('BRAND_IN_USE', 'Brand is still used by products');
      throw error;
    }
    if (!deleted) throw new NotFoundError('Brand not found');
  }

  return { list, getById, remove };
}
