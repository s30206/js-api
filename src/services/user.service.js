import { NotFoundError } from '../errors/AppError.js';

export function createUserService({ userRepository }) {
  async function getById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  return { getById };
}
