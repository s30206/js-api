import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { categoryIdValidators, listCategoriesValidators } from '../validators/categories.validators.js';

// Public: no authentication.
export function createCategoriesRoutes({ categoriesController }) {
  const router = Router();

  router.get('/', listCategoriesValidators, validate, categoriesController.list);
  router.get('/:id', categoryIdValidators, validate, categoriesController.getById);

  return router;
}
