import { body } from 'express-validator';
import { nameField, passwordField, requiredStringField } from './common.validators.js';

// isString() runs first in every chain: express-validator applies the remaining
// validators to each element of an array, so ["a@b.co"] would otherwise pass as an email.
function emailField() {
  return body('email')
    .isString()
    .withMessage('Must be a string')
    .bail()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Must be a valid email')
    .bail()
    .isLength({ max: 255 })
    .withMessage('Must be at most 255 characters');
}

export const registerValidators = [
  emailField(),
  passwordField('password'),
  nameField('firstName'),
  nameField('lastName'),
];

export const loginValidators = [
  emailField(),
  requiredStringField('password'),
];
