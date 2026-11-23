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

  // The unique constraint on name is what rejects duplicates, so concurrent requests can't both succeed.
  async function create({ name }) {
    const brand = await brandRepository.create({ name });
    if (!brand) throw new ConflictError('CONFLICT', 'A brand with this name already exists');
    return brand;
  }

  async function update(id, { name }) {
    const brand = await brandRepository.update(id, { name });
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  // Only unused brands can be deleted. The database enforces that (see brandRepository.remove),
  // which, unlike a check before the delete, can't be raced by a product being added in between.
  async function remove(id) {
    if (!(await brandRepository.remove(id))) throw new NotFoundError('Brand not found');
  }

  return { list, getById, create, update, remove };
}
