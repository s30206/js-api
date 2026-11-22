import { NotFoundError } from '../errors/AppError.js';

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

  return { list, getById };
}
