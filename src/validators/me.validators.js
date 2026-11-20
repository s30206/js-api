import { body } from 'express-validator';
import { nameField, passwordField } from './auth.validators.js';

export const updateProfileValidators = [
  nameField('firstName').optional(),
  nameField('lastName').optional()
];

export const changePasswordValidators = [
  body('currentPassword').isString().withMessage('Must be a string')
  .bail()
  .notEmpty().withMessage('Is required'),
  passwordField('newPassword'),
];
