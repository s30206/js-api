import { body } from 'express-validator';
import { idParam, paginationQueries, textField } from './common.validators.js';

// Matches the CHECK (rating BETWEEN 1 AND 5) constraint of the reviews table.
function ratingField() {
  return body('rating').isInt({ min: 1, max: 5 }).withMessage('Must be an integer between 1 and 5').toInt();
}

// comment is a TEXT column that accepts null to clear it.
function commentField() {
  return textField('comment', 5000).optional({ values: 'null' });
}

// The id is the product's.
export const listReviewsValidators = [idParam(), ...paginationQueries()];

// The id is the product's.
export const createReviewValidators = [idParam(), ratingField(), commentField()];

export const updateReviewValidators = [idParam(), ratingField().optional(), commentField()];

export const reviewIdValidators = [idParam()];
