import { query } from 'express-validator';
import { booleanQuery, idParam, MAX_INT, paginationQueries } from './common.validators.js';

const SORTS = ['price', '-price', 'name', '-name', 'createdAt', '-createdAt'];
const MAX_SPEC_KEYS = 30;

// isString() rejects repeated parameters (?brandId=1&brandId=2), which arrive as arrays.
function idQuery(field) {
  return query(field)
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .isInt({ min: 1, max: MAX_INT }).withMessage('Must be a positive integer')
    .toInt();
}

// Fits NUMERIC(10,2), the type of products.price. Kept as a string and compared as NUMERIC in SQL.
function priceQuery(field) {
  return query(field)
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .matches(/^\d{1,8}(\.\d{1,2})?$/).withMessage('Must be a non-negative amount with at most 2 decimal places');
}

// Specs are stored with number and boolean values, so filter values that look like those are converted to match.
function parseSpecValue(value) {
  if (value === 'true' || value === 'false') return value === 'true';
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
}

// specs[<key>]=<value> pairs, which the 'extended' query parser (see app.js) turns into an object.
function specsQuery() {
  return query('specs')
    .optional()
    .custom((specs) => {
      if (typeof specs !== 'object' || Array.isArray(specs)) throw new Error('Must be given as specs[<key>]=<value>');
      const values = Object.values(specs);
      if (values.length > MAX_SPEC_KEYS) throw new Error(`At most ${MAX_SPEC_KEYS} spec filters are allowed`);
      if (!values.every((value) => typeof value === 'string')) throw new Error('Each spec filter must have a single value');
      return true;
    })
    .bail()
    .customSanitizer((specs) =>
      Object.fromEntries(Object.entries(specs).map(([key, value]) => [key, parseSpecValue(value)])),
    );
}

export const listProductsValidators = [
  ...paginationQueries(),
  idQuery('categoryId'),
  idQuery('brandId'),
  priceQuery('minPrice'),
  priceQuery('maxPrice'),
  booleanQuery('inStock'),
  specsQuery(),
  query('sort')
    .default('-createdAt')
    .isString().withMessage('Must be a string')
    .bail()
    .isIn(SORTS).withMessage(`Must be one of: ${SORTS.join(', ')}`),
  booleanQuery('includeInactive'),
];

export const productIdValidators = [idParam()];
