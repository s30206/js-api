import { Prisma } from '../generated/prisma/client.ts';

// Every cart item is returned with the current name, price, stock and active flag of its product.
const INCLUDE = { products: { select: { name: true, price: true, stock: true, is_active: true } } };

// Flattens a cart item into the row shape the mapper expects.
// toFixed(2) keeps money NUMERIC(10,2) strings ('2199.00'); a Prisma Decimal would serialize as '2199'.
function toRow({ products, ...item }) {
  return {
    ...item,
    product_name: products.name,
    price: products.price.toFixed(2),
    stock: products.stock,
    is_active: products.is_active,
    line_total: products.price.mul(item.quantity).toFixed(2),
  };
}

export function createCartRepository({ prisma }) {
  // Items oldest first, plus the cart total. Money is summed as exact Decimals, never as JavaScript numbers.
  async function findByUser(userId, db = prisma) {
    const items = await db.cart_items.findMany({
      where: { user_id: userId },
      include: INCLUDE,
      orderBy: [{ added_at: 'asc' }, { product_id: 'asc' }],
    });
    const total = items.reduce(
      (sum, { products, quantity }) => sum.plus(products.price.mul(quantity)),
      new Prisma.Decimal(0),
    );
    return { items: items.map(toRow), total: total.toFixed(2) };
  }

  // A product that is already in the user's cart makes Prisma throw an error with code P2002 (primary key).
  async function create(userId, productId, quantity, db = prisma) {
    await db.cart_items.create({ data: { user_id: userId, product_id: productId, quantity } });
  }

  // Returns false when the product isn't in the user's cart. added_at keeps the time it was first added.
  async function update(userId, productId, quantity, db = prisma) {
    const { count } = await db.cart_items.updateMany({
      where: { user_id: userId, product_id: productId },
      data: { quantity },
    });
    return count > 0;
  }

  // Returns false when the product isn't in the user's cart.
  async function removeItem(userId, productId, db = prisma) {
    const { count } = await db.cart_items.deleteMany({ where: { user_id: userId, product_id: productId } });
    return count > 0;
  }

  async function clear(userId, db = prisma) {
    await db.cart_items.deleteMany({ where: { user_id: userId } });
  }

  return { findByUser, create, update, removeItem, clear };
}
