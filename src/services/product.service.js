import { NotFoundError } from '../errors/AppError.js';

// viewer is req.user, or undefined for anonymous requests. Only admins can see inactive (delisted) products.
function isAdmin(viewer) {
  return viewer?.role === 'admin';
}

export function createProductService({ productRepository }) {
  // includeInactive is ignored for anyone but admins.
  async function list(
    { page, limit, sort, categoryId, brandId, minPrice, maxPrice, inStock, specs, includeInactive },
    viewer,
  ) {
    const filters = {
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      inStock,
      specs,
      activeOnly: !(includeInactive && isAdmin(viewer)),
    };
    const [products, total] = await Promise.all([
      productRepository.list(filters, { sort, limit, offset: (page - 1) * limit }),
      productRepository.count(filters),
    ]);
    return { products, total };
  }

  // To non-admins an inactive product looks the same as one that doesn't exist.
  async function getById(id, viewer) {
    const product = await productRepository.findById(id);
    if (!product || (!product.is_active && !isAdmin(viewer))) throw new NotFoundError('Product not found');
    return product;
  }

  return { list, getById };
}
