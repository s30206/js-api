import { AppError } from '../errors/AppError.js';
import { Prisma } from '../generated/prisma/client.ts';

// Constraint violations, answered with 409 CONFLICT.
const PRISMA_CONFLICT_MESSAGES = {
  P2002: 'A resource with the same unique value already exists', // unique constraint
  P2003: 'The change would break a reference between resources', // foreign key constraint
};

// Express only treats a middleware as an error handler when it declares all four arguments.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    const { code, message, details } = error;
    return res.status(error.statusCode).json({ error: { code, message, ...(details && { details }) } });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && PRISMA_CONFLICT_MESSAGES[error.code]) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: PRISMA_CONFLICT_MESSAGES[error.code] } });
  }

  // Client errors raised by express.json(): malformed JSON, body too large, unsupported charset.
  if (error.expose && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }

  console.error('Unhandled error', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
