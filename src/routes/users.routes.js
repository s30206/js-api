import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { listUsersValidators, updateUserStatusValidators, userIdValidators } from '../validators/users.validators.js';

export function createUsersRoutes({ usersController, authenticate }) {
  const router = Router();
  const requireAdmin = authorize('admin');

  router.get('/', authenticate, requireAdmin, listUsersValidators, validate, usersController.list);
  router.get('/:id', authenticate, requireAdmin, userIdValidators, validate, usersController.getById);
  router.patch('/:id/status', authenticate, requireAdmin, updateUserStatusValidators, validate, usersController.updateStatus);

  return router;
}
