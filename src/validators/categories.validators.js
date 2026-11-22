import { idParam, nameField, paginationQueries, textField } from './common.validators.js';

export const listCategoriesValidators = [...paginationQueries()];

export const categoryIdValidators = [idParam()];

// Lowercase words separated by single hyphens, e.g. "motherboard" or "power-supply".
function slugField() {
  return textField('slug', 100)
    .bail()
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('May contain only lowercase letters, digits and single hyphens between them');
}

// description is a TEXT column that accepts null to clear it.
export const createCategoryValidators = [
  nameField('name'),
  slugField(),
  textField('description', 5000).optional({ values: 'null' }),
];

export const updateCategoryValidators = [
  idParam(),
  nameField('name').optional(),
  slugField().optional(),
  textField('description', 5000).optional({ values: 'null' }),
];
