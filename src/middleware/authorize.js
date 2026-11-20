import { ForbiddenError } from '../errors/AppError.js';

// Must run after authenticate, which sets req.user.
export function authorize(...roles) {
  return function checkRole(req, res, next) {
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}
