import { ConflictError, NotFoundError } from '../errors/AppError.js';

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

  // The unique constraint on sku is what rejects duplicates, so concurrent requests can't both succeed.
  async function create(fields) {
    const product = await productRepository.create(fields);
    if (!product) throw new ConflictError('CONFLICT', 'A product with this SKU already exists');
    return product;
  }

  // Works on inactive products too, so isActive: true reactivates a deleted one.
  async function update(id, fields) {
    const product = await productRepository.update(id, fields);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  // Soft delete: past orders, carts and reviews keep referencing the product.
  async function remove(id) {
    if (!(await productRepository.deactivate(id))) throw new NotFoundError('Product not found');
  }

  return { list, getById, create, update, remove };
}
