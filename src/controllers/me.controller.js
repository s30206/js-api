import { toUserDto } from '../mappers/user.mapper.js';

export function createMeController({ userService, authService }) {
  async function getProfile(req, res) {
    res.json(toUserDto(await userService.getById(req.user.id)));
  }

  async function updateProfile(req, res) {
    const { firstName, lastName } = req.body;
    res.json(toUserDto(await userService.updateProfile(req.user.id, { firstName, lastName })));
  }

  async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    res.status(204).end();
  }

  return { getProfile, updateProfile, changePassword };
}
