import { NotFoundError } from '../errors/AppError.js';

export function createUserService({ userRepository }) {
  async function getById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async function updateProfile(id, { firstName, lastName }) {
    const user = await userRepository.updateProfile(id, { firstName, lastName });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  return { getById, updateProfile };
}
