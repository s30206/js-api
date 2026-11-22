import { idParam, paginationQueries } from './common.validators.js';

export const listBrandsValidators = [...paginationQueries()];

export const brandIdValidators = [idParam()];
