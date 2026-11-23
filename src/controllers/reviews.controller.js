import { matchedData } from 'express-validator';
import { toReviewDto } from '../mappers/review.mapper.js';

export function createReviewsController({ reviewService }) {
  async function listByProduct(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const { page, limit } = matchedData(req, { locations: ['query'] });
    const { reviews, total } = await reviewService.listByProduct(req.params.id, { page, limit });
    res.json({
      data: reviews.map(toReviewDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async function create(req, res) {
    const { rating, comment } = req.body;
    res.status(201).json(toReviewDto(await reviewService.create(req.params.id, req.user.id, { rating, comment })));
  }

  async function update(req, res) {
    const { rating, comment } = req.body ?? {};
    res.json(toReviewDto(await reviewService.update(req.params.id, req.user.id, { rating, comment })));
  }

  async function remove(req, res) {
    await reviewService.remove(req.params.id, req.user);
    res.status(204).end();
  }

  return { listByProduct, create, update, remove };
}
