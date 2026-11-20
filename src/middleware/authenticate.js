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

// Same checks as authenticate, but only when an Authorization header is sent; without one the request
// continues anonymously (req.user stays undefined). A bad token is still rejected rather than ignored.
export function createAuthenticateOptional({ authService }) {
  const authenticate = createAuthenticate({ authService });
  return function authenticateOptional(req, res, next) {
    if (req.get('Authorization') === undefined) return next();
    return authenticate(req, res, next);
  };
}
