import { UnauthorizedError } from '../errors/AppError.js';

export function createAuthenticate({ authService }) {
  return async function authenticate(req, res, next) {
    const [scheme, token] = req.get('Authorization')?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Missing bearer token');
    }

    const user = await authService.authenticate(token);
    // Role comes from the database, not the token, so role changes apply immediately.
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  };
}
