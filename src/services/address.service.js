import { config } from '../config/index.js';
import { ConflictError, NotFoundError } from '../errors/AppError.js';

export function createAddressService({ addressRepository, userRepository, withTransaction }) {
  async function list(userId) {
    return addressRepository.listByUser(userId);
  }

  async function create(userId, fields) {
    return withTransaction(async (client) => {
      // Locking the user row serializes concurrent creates for the same user,
      // so two requests can't both pass the limit check.
      await userRepository.lockById(userId, client);
      if ((await addressRepository.countByUser(userId, client)) >= config.maxAddressesPerUser) {
        throw new ConflictError(
          'ADDRESS_LIMIT_REACHED',
          `You can have at most ${config.maxAddressesPerUser} addresses`,
        );
      }
      return addressRepository.create(userId, fields, client);
    });
  }

  async function update(userId, addressId, fields) {
    const address = await addressRepository.update(addressId, userId, fields);
    if (!address) throw new NotFoundError('Address not found');
    return address;
  }

  async function remove(userId, addressId) {
    if (!(await addressRepository.remove(addressId, userId))) throw new NotFoundError('Address not found');
  }

  return { list, create, update, remove };
}
