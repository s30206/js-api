import { toUserDto } from '../mappers/user.mapper.js';

export function createAuthController({ authService }) {
  async function register(req, res) {
    const { email, password, firstName, lastName } = req.body;
    const user = await authService.register({ email, password, firstName, lastName });
    res.status(201).json(toUserDto(user));
  }

  async function login(req, res) {
    const { email, password } = req.body;
    res.json(await authService.login({ email, password }));
  }

  return { register, login };
}
