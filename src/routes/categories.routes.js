import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { categoryIdValidators, listCategoriesValidators } from '../validators/categories.validators.js';

// Reading is public; changing categories is admin only.
export function createCategoriesRoutes({ categoriesController, authenticate }) {
  const router = Router();
  const requireAdmin = authorize('admin');

  router.get('/', listCategoriesValidators, validate, categoriesController.list);
  router.get('/:id', categoryIdValidators, validate, categoriesController.getById);
  router.delete('/:id', authenticate, requireAdmin, categoryIdValidators, validate, categoriesController.remove);

  return router;
}
