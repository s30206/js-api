import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { checkoutValidators, listOrdersValidators, orderIdValidators } from '../validators/orders.validators.js';

// Checkout is customer only. Reading is open to both roles; the service limits customers to their own orders.
export function createOrdersRoutes({ ordersController, authenticate }) {
  const router = Router();
  const requireCustomer = authorize('customer');

  router.post('/', authenticate, requireCustomer, checkoutValidators, validate, ordersController.checkout);
  router.get('/', authenticate, listOrdersValidators, validate, ordersController.list);
  router.get('/:id', authenticate, orderIdValidators, validate, ordersController.getById);

  return router;
}
