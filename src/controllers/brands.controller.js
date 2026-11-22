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

  return { list, getById };
}
