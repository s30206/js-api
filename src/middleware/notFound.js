import { NotFoundError } from '../errors/AppError.js';

export function notFound(req) {
  throw new NotFoundError(`Route ${req.method} ${req.path} not found`);
}
