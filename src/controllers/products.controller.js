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

  async function create(req, res) {
    const { categoryId, brandId, sku, name, description, price, stock, specs } = req.body;
    const product = await productService.create({ categoryId, brandId, sku, name, description, price, stock, specs });
    res.status(201).json(toProductDto(product));
  }

  async function update(req, res) {
    const { categoryId, brandId, sku, name, description, price, stock, specs, isActive } = req.body ?? {};
    const product = await productService.update(req.params.id, {
      categoryId,
      brandId,
      sku,
      name,
      description,
      price,
      stock,
      specs,
      isActive,
    });
    res.json(toProductDto(product));
  }

  async function remove(req, res) {
    await productService.remove(req.params.id);
    res.status(204).end();
  }

  return { list, getById, create, update, remove };
}
