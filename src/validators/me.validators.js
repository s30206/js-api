import { body } from 'express-validator';
import { idParam, nameField, passwordField, requiredStringField, textField } from './common.validators.js';

export const updateProfileValidators = [
  nameField('firstName').optional(),
  nameField('lastName').optional()
];

export const changePasswordValidators = [
  requiredStringField('currentPassword'),
  passwordField('newPassword'),
];

// Maximum lengths match the columns of the addresses table.
function phoneField() {
  return textField('phone', 30)
    .bail()
    .matches(/^\+?[0-9 ()-]+$/)
    .withMessage('May contain only digits, spaces, parentheses, hyphens and a leading +');
}

function countryField() {
  return body('country')
    .isString()
    .withMessage('Must be a string')
    .bail()
    .trim()
    .toUpperCase()
    .isISO31661Alpha2()
    .withMessage('Must be an ISO 3166-1 alpha-2 country code');
}

export const createAddressValidators = [
  textField('label', 50).optional({ values: 'null' }),
  textField('recipientName', 200),
  phoneField(),
  textField('street', 255),
  textField('city', 100),
  textField('postalCode', 20),
  countryField().optional(),
];

// label accepts null to clear it; the other columns are NOT NULL.
export const updateAddressValidators = [
  idParam(),
  textField('label', 50).optional({ values: 'null' }),
  textField('recipientName', 200).optional(),
  phoneField().optional(),
  textField('street', 255).optional(),
  textField('city', 100).optional(),
  textField('postalCode', 20).optional(),
  countryField().optional(),
];

export const addressIdValidators = [idParam()];
