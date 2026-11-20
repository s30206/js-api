import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/AppError.js';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    throw new ValidationError(
      result
        .array({ onlyFirstError: true })
        .map((error) => ({ field: error.path, location: error.location, message: error.msg })),
    );
  }
  next();
}
