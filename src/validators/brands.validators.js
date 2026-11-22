import { idParam, nameField, paginationQueries } from './common.validators.js';

export const listBrandsValidators = [...paginationQueries()];

export const brandIdValidators = [idParam()];

export const createBrandValidators = [nameField('name')];

export const updateBrandValidators = [idParam(), nameField('name').optional()];
