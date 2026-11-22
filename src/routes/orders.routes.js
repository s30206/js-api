import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  checkoutValidators,
  listOrdersValidators,
  orderIdValidators,
  updateOrderStatusValidators,
} from '../validators/orders.validators.js';

// Checkout is customer only and status changes are admin only. Reading is open to both roles; the service
// limits customers to their own orders.
export function createOrdersRoutes({ ordersController, authenticate }) {
  const router = Router();
  const requireCustomer = authorize('customer');
  const requireAdmin = authorize('admin');

  router.post('/', authenticate, requireCustomer, checkoutValidators, validate, ordersController.checkout);
  router.get('/', authenticate, listOrdersValidators, validate, ordersController.list);
  router.get('/:id', authenticate, orderIdValidators, validate, ordersController.getById);
  router.patch('/:id/status', authenticate, requireAdmin, updateOrderStatusValidators, validate, ordersController.updateStatus);

  return router;
}
