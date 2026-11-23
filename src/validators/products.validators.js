import { body, query } from 'express-validator';
import { booleanQuery, idParam, idQuery, MAX_INT, paginationQueries, textField } from './common.validators.js';

const SORTS = ['price', '-price', 'name', '-name', 'createdAt', '-createdAt'];
const MAX_SPEC_KEYS = 30;
const SPEC_VALUE_TYPES = ['string', 'number', 'boolean'];

// Fits NUMERIC(10,2), the type of products.price.
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const PRICE_MESSAGE = 'Must be a non-negative amount with at most 2 decimal places';

// Kept as a string and compared as NUMERIC in SQL.
function priceQuery(field) {
  return query(field)
    .optional()
    .isString().withMessage('Must be a string')
    .bail()
    .matches(PRICE_PATTERN).withMessage(PRICE_MESSAGE);
}

// A string, like every amount the API returns, so no precision is lost to JavaScript numbers.
function priceField() {
  return body('price')
    .isString().withMessage('Must be a string')
    .bail()
    .matches(PRICE_PATTERN).withMessage(PRICE_MESSAGE);
}

// isInt() checks each element of an array on its own, so [5] would pass without the isArray() check first.
function intField(field, min, message) {
  return body(field)
    .not().isArray().withMessage(message)
    .bail()
    .isInt({ min, max: MAX_INT }).withMessage(message)
    .toInt();
}

// A flat object of string, number and boolean values, so every spec can be matched by the specs[<key>] filter.
function specsField() {
  return body('specs')
    .isObject().withMessage('Must be an object')
    .bail()
    .custom((specs) => {
      const values = Object.values(specs);
      if (values.length > MAX_SPEC_KEYS) throw new Error(`At most ${MAX_SPEC_KEYS} keys are allowed`);
      if (!values.every((value) => SPEC_VALUE_TYPES.includes(typeof value))) {
        throw new Error('Values must be strings, numbers or booleans');
      }
      return true;
    });
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

// Maximum lengths match the columns of the products table. description is a TEXT column that accepts null to clear it.
export const createProductValidators = [
  intField('categoryId', 1, 'Must be a positive integer'),
  intField('brandId', 1, 'Must be a positive integer'),
  textField('sku', 64),
  textField('name', 255),
  textField('description', 5000).optional({ values: 'null' }),
  priceField(),
  intField('stock', 0, 'Must be a non-negative integer'),
  specsField().optional(),
];

// specs replaces the whole object. isActive: true reactivates a deleted (delisted) product.
export const updateProductValidators = [
  idParam(),
  intField('categoryId', 1, 'Must be a positive integer').optional(),
  intField('brandId', 1, 'Must be a positive integer').optional(),
  textField('sku', 64).optional(),
  textField('name', 255).optional(),
  textField('description', 5000).optional({ values: 'null' }),
  priceField().optional(),
  intField('stock', 0, 'Must be a non-negative integer').optional(),
  specsField().optional(),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('Must be a boolean'),
];
