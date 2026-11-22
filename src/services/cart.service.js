import { ConflictError, NotFoundError } from '../errors/AppError.js';

export function createCartService({ cartRepository, productRepository, userRepository, prisma }) {
  // An item is unavailable when its product was delisted or its stock dropped below the cart quantity.
  async function get(userId) {
    const { items, total } = await cartRepository.findByUser(userId);
    return {
      items: items.map((item) => ({ ...item, available: item.is_active && item.stock >= item.quantity })),
      total,
    };
  }

  async function setItem(userId, productId, quantity) {
    const product = await productRepository.findById(productId);
    if (!product || !product.is_active) throw new NotFoundError('Product not found');
    if (quantity > product.stock) {
      throw new ConflictError('INSUFFICIENT_STOCK', `Only ${product.stock} in stock`);
    }
    await prisma.$transaction(async (tx) => {
      await userRepository.lockById(userId, tx);
      if (!(await cartRepository.update(userId, productId, quantity, tx))) {
        await cartRepository.create(userId, productId, quantity, tx);
      }
    });
    return get(userId);
  }

  async function removeItem(userId, productId) {
    if (!(await cartRepository.removeItem(userId, productId))) throw new NotFoundError('Product is not in the cart');
  }

  async function clear(userId) {
    await cartRepository.clear(userId);
  }

  return { get, setItem, removeItem, clear };
}
