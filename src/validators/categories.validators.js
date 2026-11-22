import { idParam, paginationQueries } from './common.validators.js';

export const listCategoriesValidators = [...paginationQueries()];

export const categoryIdValidators = [idParam()];
