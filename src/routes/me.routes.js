import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { changePasswordValidators, updateProfileValidators } from '../validators/me.validators.js';

export function createMeRoutes({ meController, authenticate }) {
  const router = Router();

  router.get('/', authenticate, meController.getProfile);
  router.patch('/', authenticate, updateProfileValidators, validate, meController.updateProfile);
  router.put('/password', authenticate, changePasswordValidators, validate, meController.changePassword);

  return router;
}
