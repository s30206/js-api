import { matchedData } from 'express-validator';
import { toCategoryDto } from '../mappers/category.mapper.js';

export function createCategoriesController({ categoryService }) {
  async function list(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const { page, limit } = matchedData(req, { locations: ['query'] });
    const { categories, total } = await categoryService.list({ page, limit });
    res.json({
      data: categories.map(toCategoryDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async function getById(req, res) {
    res.json(toCategoryDto(await categoryService.getById(req.params.id)));
  }

  return { list, getById };
}
