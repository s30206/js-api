import { ConflictError, NotFoundError } from '../errors/AppError.js';

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

  async function list({ page, limit, role, isActive }) {
    const filters = { role, isActive };
    const [users, total] = await Promise.all([
      userRepository.list(filters, { limit, offset: (page - 1) * limit }),
      userRepository.count(filters),
    ]);
    return { users, total };
  }

  // actorId is the admin making the change; blocking yourself would lock you out immediately.
  async function updateStatus(actorId, userId, { isActive }) {
    if (userId === actorId && !isActive) throw new ConflictError('CONFLICT', 'You cannot block your own account');
    const user = await userRepository.updateStatus(userId, isActive);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  return { getById, updateProfile, list, updateStatus };
}
