import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { cartItemIdValidators, setCartItemValidators } from '../validators/cart.validators.js';

export function createCartRoutes({ cartController, authenticate }) {
  const router = Router();
  const requireCustomer = authorize('customer');

  router.get('/', authenticate, requireCustomer, cartController.get);
  router.delete('/', authenticate, requireCustomer, cartController.clear);
  router.put('/items/:id', authenticate, requireCustomer, setCartItemValidators, validate, cartController.setItem);
  router.delete('/items/:id', authenticate, requireCustomer, cartItemIdValidators, validate, cartController.removeItem);

  return router;
}
