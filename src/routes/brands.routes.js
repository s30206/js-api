import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { brandIdValidators, listBrandsValidators } from '../validators/brands.validators.js';

// Reading is public; changing brands is admin only.
export function createBrandsRoutes({ brandsController, authenticate }) {
  const router = Router();
  const requireAdmin = authorize('admin');

  router.get('/', listBrandsValidators, validate, brandsController.list);
  router.get('/:id', brandIdValidators, validate, brandsController.getById);
  router.delete('/:id', authenticate, requireAdmin, brandIdValidators, validate, brandsController.remove);

  return router;
}
