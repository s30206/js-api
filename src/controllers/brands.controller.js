import { matchedData } from 'express-validator';
import { toBrandDto } from '../mappers/brand.mapper.js';

export function createBrandsController({ brandService }) {
  async function list(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const { page, limit } = matchedData(req, { locations: ['query'] });
    const { brands, total } = await brandService.list({ page, limit });
    res.json({
      data: brands.map(toBrandDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async function getById(req, res) {
    res.json(toBrandDto(await brandService.getById(req.params.id)));
  }

  async function create(req, res) {
    const { name } = req.body;
    res.status(201).json(toBrandDto(await brandService.create({ name })));
  }

  async function update(req, res) {
    const { name } = req.body ?? {};
    res.json(toBrandDto(await brandService.update(req.params.id, { name })));
  }

  async function remove(req, res) {
    await brandService.remove(req.params.id);
    res.status(204).end();
  }

  return { list, getById, create, update, remove };
}
