import { Router } from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { createBrandsRoutes } from './brands.routes.js';
import { createCartRoutes } from './cart.routes.js';
import { createCategoriesRoutes } from './categories.routes.js';
import { createMeRoutes } from './me.routes.js';
import { createProductsRoutes } from './products.routes.js';
import { createUsersRoutes } from './users.routes.js';

export function createApiRouter(container) {
  const router = Router();

  router.get('/health', container.healthController.check);
  router.use('/auth', createAuthRoutes(container));
  router.use('/me', createMeRoutes(container));
  router.use('/users', createUsersRoutes(container));
  router.use('/categories', createCategoriesRoutes(container));
  router.use('/brands', createBrandsRoutes(container));
  router.use('/products', createProductsRoutes(container));
  router.use('/cart', createCartRoutes(container));

  return router;
}
