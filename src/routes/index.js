import { Router } from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { createMeRoutes } from './me.routes.js';
import { createUsersRoutes } from './users.routes.js';

export function createApiRouter(container) {
  const router = Router();

  router.get('/health', container.healthController.check);
  router.use('/auth', createAuthRoutes(container));
  router.use('/me', createMeRoutes(container));
  router.use('/users', createUsersRoutes(container));

  return router;
}
