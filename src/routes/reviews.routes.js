import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { reviewIdValidators, updateReviewValidators } from '../validators/reviews.validators.js';

// Listing and writing reviews live under /products/:id/reviews (see products.routes.js). Editing is for authors,
// who are always customers. Deleting is open to both roles; the service limits customers to their own reviews.
export function createReviewsRoutes({ reviewsController, authenticate }) {
  const router = Router();
  const requireCustomer = authorize('customer');

  router.patch('/:id', authenticate, requireCustomer, updateReviewValidators, validate, reviewsController.update);
  router.delete('/:id', authenticate, reviewIdValidators, validate, reviewsController.remove);

  return router;
}
