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

  async function create(req, res) {
    const { name, slug, description } = req.body;
    res.status(201).json(toCategoryDto(await categoryService.create({ name, slug, description })));
  }

  async function update(req, res) {
    const { name, slug, description } = req.body ?? {};
    res.json(toCategoryDto(await categoryService.update(req.params.id, { name, slug, description })));
  }

  async function remove(req, res) {
    await categoryService.remove(req.params.id);
    res.status(204).end();
  }

  return { list, getById, create, update, remove };
}
