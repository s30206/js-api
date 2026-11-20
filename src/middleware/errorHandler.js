import { AppError } from '../errors/AppError.js';

// Express only treats a middleware as an error handler when it declares all four arguments.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    const { code, message, details } = error;
    return res.status(error.statusCode).json({ error: { code, message, ...(details && { details }) } });
  }

  // Client errors raised by express.json(): malformed JSON, body too large, unsupported charset.
  if (error.expose && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }

  console.error('Unhandled error', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
