import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginValidators, registerValidators } from '../validators/auth.validators.js';

export function createAuthRoutes({ authController }) {
  const router = Router();

  router.post('/register', registerValidators, validate, authController.register);
  router.post('/login', loginValidators, validate, authController.login);

  return router;
}
