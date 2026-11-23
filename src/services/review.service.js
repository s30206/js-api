import { ConflictError, ForbiddenError, NotFoundError } from '../errors/AppError.js';

// viewer is req.user. Customers can only delete their own reviews; admins can delete any review.
function isAdmin(viewer) {
  return viewer.role === 'admin';
}

export function createReviewService({ reviewRepository, productRepository, orderRepository }) {
  // An inactive product looks the same as one that doesn't exist, as it does on the public product endpoints.
  async function ensureProductVisible(productId) {
    const product = await productRepository.findById(productId);
    if (!product || !product.is_active) throw new NotFoundError('Product not found');
  }

  async function listByProduct(productId, { page, limit }) {
    await ensureProductVisible(productId);
    const [reviews, total] = await Promise.all([
      reviewRepository.listByProduct(productId, { limit, offset: (page - 1) * limit }),
      reviewRepository.countByProduct(productId),
    ]);
    return { reviews, total };
  }

  // Only verified buyers (a delivered order containing the product) can review, once per product. Delivered is a
  // final status, so the check can't go stale before the insert. The unique (product_id, user_id) constraint is what
  // rejects a second review, so concurrent requests can't both succeed.
  async function create(productId, userId, { rating, comment }) {
    await ensureProductVisible(productId);
    if (!(await orderRepository.hasDeliveredProduct(userId, productId))) {
      throw new ForbiddenError('REVIEW_NOT_ALLOWED', 'Only customers who received this product can review it');
    }
    const review = await reviewRepository.create(productId, userId, { rating, comment });
    if (!review) throw new ConflictError('ALREADY_REVIEWED', 'You have already reviewed this product');
    return review;
  }

  // Authors only. To a customer, another customer's review looks the same as one that doesn't exist.
  async function update(id, userId, { rating, comment }) {
    const review = await reviewRepository.update(id, userId, { rating, comment });
    if (!review) throw new NotFoundError('Review not found');
    return review;
  }

  async function remove(id, viewer) {
    if (!(await reviewRepository.remove(id, isAdmin(viewer) ? undefined : viewer.id))) {
      throw new NotFoundError('Review not found');
    }
  }

  return { listByProduct, create, update, remove };
}
