import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createProductValidators,
  listProductsValidators,
  productIdValidators,
  updateProductValidators,
} from '../validators/products.validators.js';
import { createReviewValidators, listReviewsValidators } from '../validators/reviews.validators.js';

// Public, but an admin's token unlocks inactive products, hence the optional authentication.
// Creating, updating and deleting products is admin only.
// Reviews are public to read; writing one is customer only.
export function createProductsRoutes({ productsController, reviewsController, authenticate, authenticateOptional }) {
  const router = Router();
  const requireCustomer = authorize('customer');
  const requireAdmin = authorize('admin');

  router.get('/', authenticateOptional, listProductsValidators, validate, productsController.list);
  router.get('/:id', authenticateOptional, productIdValidators, validate, productsController.getById);
  router.post('/', authenticate, requireAdmin, createProductValidators, validate, productsController.create);
  router.patch('/:id', authenticate, requireAdmin, updateProductValidators, validate, productsController.update);
  router.delete('/:id', authenticate, requireAdmin, productIdValidators, validate, productsController.remove);
  router.get('/:id/reviews', listReviewsValidators, validate, reviewsController.listByProduct);
  router.post('/:id/reviews', authenticate, requireCustomer, createReviewValidators, validate, reviewsController.create);

  return router;
}
