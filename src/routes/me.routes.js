import { Router } from 'express';

export function createMeRoutes({ meController, authenticate }) {
  const router = Router();

  router.get('/', authenticate, meController.getProfile);

  return router;
}
