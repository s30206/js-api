import { body, query } from 'express-validator';
import { booleanQuery, idParam, paginationQueries } from './common.validators.js';

export const listUsersValidators = [
  ...paginationQueries(),
  query('role')
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(['customer', 'admin']).withMessage('Must be one of: customer, admin'),
  booleanQuery('isActive'),
];

export const userIdValidators = [idParam()];

export const updateUserStatusValidators = [
  idParam(),
  body('isActive').isBoolean({ strict: true }).withMessage('Must be a boolean'),
];
