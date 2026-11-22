import { toCartDto } from '../mappers/cart.mapper.js';

export function createCartController({ cartService }) {
  async function get(req, res) {
    res.json(toCartDto(await cartService.get(req.user.id)));
  }

  async function setItem(req, res) {
    const { quantity } = req.body;
    res.json(toCartDto(await cartService.setItem(req.user.id, req.params.id, quantity)));
  }

  async function removeItem(req, res) {
    await cartService.removeItem(req.user.id, req.params.id);
    res.status(204).end();
  }

  async function clear(req, res) {
    await cartService.clear(req.user.id);
    res.status(204).end();
  }

  return { get, setItem, removeItem, clear };
}
