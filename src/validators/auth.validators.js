import { body } from 'express-validator';

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

export function nameField(field) {
  return body(field)
    .isString()
    .withMessage('Must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Must be 1-100 characters');
}

export function passwordField(field) {
  return body(field)
    .isString()
    .withMessage('Must be a string')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('Must be 8-72 characters')
    .bail()
    // bcrypt silently ignores everything past 72 bytes, which multibyte characters can reach early.
    .isByteLength({ max: 72 })
    .withMessage('Must be at most 72 bytes');
}

export const registerValidators = [
  emailField(),
  passwordField('password'),
  nameField('firstName'),
  nameField('lastName'),
];

export const loginValidators = [
  emailField(),
  body('password').isString().withMessage('Must be a string').bail().notEmpty().withMessage('Is required'),
];
