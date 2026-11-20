import { Router } from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { createMeRoutes } from './me.routes.js';

export function createApiRouter(container) {
  const router = Router();

  router.get('/health', container.healthController.check);
  router.use('/auth', createAuthRoutes(container));
  router.use('/me', createMeRoutes(container));

  return router;
}
