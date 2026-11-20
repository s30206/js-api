import { toUserDto } from '../mappers/user.mapper.js';

export function createMeController({ userService }) {
  async function getProfile(req, res) {
    res.json(toUserDto(await userService.getById(req.user.id)));
  }

  return { getProfile };
}
