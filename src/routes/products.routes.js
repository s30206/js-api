import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { listProductsValidators, productIdValidators } from '../validators/products.validators.js';

// Public, but an admin's token unlocks inactive products, hence the optional authentication.
export function createProductsRoutes({ productsController, authenticateOptional }) {
  const router = Router();

  router.get('/', authenticateOptional, listProductsValidators, validate, productsController.list);
  router.get('/:id', authenticateOptional, productIdValidators, validate, productsController.getById);

  return router;
}
