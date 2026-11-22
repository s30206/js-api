import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { brandIdValidators, listBrandsValidators } from '../validators/brands.validators.js';

// Public: no authentication.
export function createBrandsRoutes({ brandsController }) {
  const router = Router();

  router.get('/', listBrandsValidators, validate, brandsController.list);
  router.get('/:id', brandIdValidators, validate, brandsController.getById);

  return router;
}
