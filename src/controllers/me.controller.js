import { toAddressDto } from '../mappers/address.mapper.js';
import { toUserDto } from '../mappers/user.mapper.js';

export function createMeController({ userService, authService, addressService }) {
  async function getProfile(req, res) {
    res.json(toUserDto(await userService.getById(req.user.id)));
  }

  async function updateProfile(req, res) {
    const { firstName, lastName } = req.body ?? {};
    res.json(toUserDto(await userService.updateProfile(req.user.id, { firstName, lastName })));
  }

  async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    res.status(204).end();
  }

  async function listAddresses(req, res) {
    const addresses = await addressService.list(req.user.id);
    res.json(addresses.map(toAddressDto));
  }

  async function createAddress(req, res) {
    const { label, recipientName, phone, street, city, postalCode, country } = req.body;
    const address = await addressService.create(req.user.id, {
      label,
      recipientName,
      phone,
      street,
      city,
      postalCode,
      country,
    });
    res.status(201).json(toAddressDto(address));
  }

  async function updateAddress(req, res) {
    const { label, recipientName, phone, street, city, postalCode, country } = req.body ?? {};
    const address = await addressService.update(req.user.id, req.params.id, {
      label,
      recipientName,
      phone,
      street,
      city,
      postalCode,
      country,
    });
    res.json(toAddressDto(address));
  }

  async function deleteAddress(req, res) {
    await addressService.remove(req.user.id, req.params.id);
    res.status(204).end();
  }

  return {
    getProfile,
    updateProfile,
    changePassword,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
  };
}
