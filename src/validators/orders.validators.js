import { body, query } from 'express-validator';
import { idParam, idQuery, MAX_INT, paginationQueries } from './common.validators.js';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

export const checkoutValidators = [
  body('addressId').isInt({ min: 1, max: MAX_INT }).withMessage('Must be a positive integer').toInt(),
];

export const listOrdersValidators = [
  ...paginationQueries(),
  query('status')
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(STATUSES).withMessage(`Must be one of: ${STATUSES.join(', ')}`),
  idQuery('userId'),
];

export const orderIdValidators = [idParam()];
