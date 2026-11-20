import { body, param, query } from 'express-validator';
import { config } from '../config/index.js';

// Rules shared by several resources. Rules used by a single resource stay in that resource's file.

// Upper bounds keep values inside PostgreSQL's INTEGER range.
export const MAX_INT = 2147483647;

export function textField(field, max) {
  return body(field)
    .isString()
    .withMessage('Must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max })
    .withMessage(`Must be 1-${max} characters`);
}

export function nameField(field) {
  return textField(field, 100);
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

export function requiredStringField(field) {
  return body(field).isString().withMessage('Must be a string').bail().notEmpty().withMessage('Is required');
}

export function idParam() {
  return param('id').isInt({ min: 1, max: MAX_INT }).withMessage('Must be a positive integer').toInt();
}

// isString() rejects repeated parameters (?page=1&page=2), which arrive as arrays.
// Express 5 re-parses req.query on every access, so read the sanitized values with matchedData().
function intQuery(field, defaultValue, max) {
  return query(field)
    .default(String(defaultValue))
    .isString()
    .withMessage('Must be a string')
    .bail()
    .isInt({ min: 1, max })
    .withMessage(`Must be an integer between 1 and ${max}`)
    .toInt();
}

export function paginationQueries() {
  return [intQuery('page', 1, MAX_INT), intQuery('limit', config.defaultPageSize, config.maxPageSize)];
}

export function booleanQuery(field) {
  return query(field)
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(['true', 'false']).withMessage('Must be true or false')
    .toBoolean(true);
}
