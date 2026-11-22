import { matchedData } from 'express-validator';
import { toOrderDto } from '../mappers/order.mapper.js';

export function createOrdersController({ orderService }) {
  async function checkout(req, res) {
    res.status(201).json(toOrderDto(await orderService.checkout(req.user.id, req.body.addressId)));
  }

  async function list(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const { page, limit, status, userId } = matchedData(req, { locations: ['query'] });
    const { orders, total } = await orderService.list({ page, limit, status, userId }, req.user);
    res.json({
      data: orders.map(toOrderDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async function getById(req, res) {
    res.json(toOrderDto(await orderService.getById(req.params.id, req.user)));
  }

  return { checkout, list, getById };
}
