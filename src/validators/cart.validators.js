import { body } from 'express-validator';
import { config } from '../config/index.js';
import { idParam } from './common.validators.js';

export const setCartItemValidators = [
  idParam(),
  body('quantity')
    .isInt({ min: 1, max: config.maxCartItemQuantity })
    .withMessage(`Must be an integer between 1 and ${config.maxCartItemQuantity}`)
    .toInt(),
];

export const cartItemIdValidators = [idParam()];
