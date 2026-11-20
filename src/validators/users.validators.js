import { body, param, query } from 'express-validator';
import { config } from '../config/index.js';

// Upper bounds keep values inside PostgreSQL's INTEGER range.
export const MAX_INT = 2147483647;

// isString() rejects repeated parameters (?page=1&page=2), which arrive as arrays.
// Express 5 re-parses req.query on every access, so read the sanitized values with matchedData().
export function intQuery(field, defaultValue, max) {
  return query(field)
    .default(String(defaultValue))
    .isString()
    .withMessage('Must be a string')
    .bail()
    .isInt({ min: 1, max })
    .withMessage(`Must be an integer between 1 and ${max}`)
    .toInt();
}

function userIdParam() {
  return param('id').isInt({ min: 1, max: MAX_INT }).withMessage('Must be a positive integer').toInt();
}

export const listUsersValidators = [
  intQuery('page', 1, MAX_INT),
  intQuery('limit', config.defaultPageSize, config.maxPageSize),
  query('role')
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(['customer', 'admin']).withMessage('Must be one of: customer, admin'),
  query('isActive')
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(['true', 'false']).withMessage('Must be true or false')
    .toBoolean(true),
];

export const userIdValidators = [userIdParam()];

export const updateUserStatusValidators = [
  userIdParam(),
  body('isActive').isBoolean({ strict: true }).withMessage('Must be a boolean'),
];
