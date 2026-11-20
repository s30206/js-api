import { matchedData } from 'express-validator';
import { toProductDto } from '../mappers/product.mapper.js';

export function createProductsController({ productService }) {
  async function list(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const query = matchedData(req, { locations: ['query'] });
    const { products, total } = await productService.list(query, req.user);
    res.json({
      data: products.map(toProductDto),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  }

  async function getById(req, res) {
    res.json(toProductDto(await productService.getById(req.params.id, req.user)));
  }

  return { list, getById };
}
