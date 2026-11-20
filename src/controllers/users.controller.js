import { matchedData } from 'express-validator';
import { toUserDto } from '../mappers/user.mapper.js';

export function createUsersController({ userService }) {
  async function list(req, res) {
    // Express 5 re-parses req.query on every access, so the sanitized values only live in matchedData().
    const { page, limit, role, isActive } = matchedData(req, { locations: ['query'] });
    const { users, total } = await userService.list({ page, limit, role, isActive });
    res.json({
      data: users.map(toUserDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async function getById(req, res) {
    res.json(toUserDto(await userService.getById(req.params.id)));
  }

  async function updateStatus(req, res) {
    const user = await userService.updateStatus(req.user.id, req.params.id, { isActive: req.body.isActive });
    res.json(toUserDto(user));
  }

  return { list, getById, updateStatus };
}
