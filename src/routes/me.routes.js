import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  addressIdValidators,
  changePasswordValidators,
  createAddressValidators,
  updateAddressValidators,
  updateProfileValidators,
} from '../validators/me.validators.js';

export function createMeRoutes({ meController, authenticate }) {
  const router = Router();
  const requireCustomer = authorize('customer');

  router.get('/', authenticate, meController.getProfile);
  router.patch('/', authenticate, updateProfileValidators, validate, meController.updateProfile);
  router.put('/password', authenticate, changePasswordValidators, validate, meController.changePassword);

  router.get('/addresses', authenticate, requireCustomer, meController.listAddresses);
  router.post('/addresses', authenticate, requireCustomer, createAddressValidators, validate, meController.createAddress);
  router.patch('/addresses/:id', authenticate, requireCustomer, updateAddressValidators, validate, meController.updateAddress);
  router.delete('/addresses/:id', authenticate, requireCustomer, addressIdValidators, validate, meController.deleteAddress);

  return router;
}
