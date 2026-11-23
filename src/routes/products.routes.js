import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { listProductsValidators, productIdValidators } from '../validators/products.validators.js';
import { createReviewValidators, listReviewsValidators } from '../validators/reviews.validators.js';

// Public, but an admin's token unlocks inactive products, hence the optional authentication.
// Reviews are public to read; writing one is customer only.
export function createProductsRoutes({ productsController, reviewsController, authenticate, authenticateOptional }) {
  const router = Router();
  const requireCustomer = authorize('customer');

  router.get('/', authenticateOptional, listProductsValidators, validate, productsController.list);
  router.get('/:id', authenticateOptional, productIdValidators, validate, productsController.getById);
  router.get('/:id/reviews', listReviewsValidators, validate, reviewsController.listByProduct);
  router.post('/:id/reviews', authenticate, requireCustomer, createReviewValidators, validate, reviewsController.create);

  return router;
}
