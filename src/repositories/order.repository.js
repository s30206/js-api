import { Prisma } from '../generated/prisma/client.ts';

// Every order is returned with its items and payment attempts, both oldest first.
const INCLUDE = {
  order_items: { orderBy: { id: 'asc' } },
  payments: { orderBy: { id: 'asc' } },
};

// Shared by list() and count(). Prisma ignores undefined values, so filters left undefined match every order.
function listWhere({ userId, status }) {
  return { user_id: userId, status };
}

// Flattens an order into the row shape the mapper expects.
// toFixed(2) keeps money NUMERIC(10,2) strings ('2199.00'); a Prisma Decimal would serialize as '2199'.
function toRow({ total_amount, order_items, payments, ...order }) {
  return {
    ...order,
    total_amount: total_amount.toFixed(2),
    items: order_items.map(({ unit_price, ...item }) => ({
      ...item,
      unit_price: unit_price.toFixed(2),
      line_total: unit_price.mul(item.quantity).toFixed(2),
    })),
    payments: payments.map(({ amount, ...payment }) => ({ ...payment, amount: amount.toFixed(2) })),
  };
}

export function createOrderRepository({ prisma }) {
  // address is a row from the address repository; lines are { product, quantity }, product being a row from
  // productRepository.lockByIds(). Their current values are copied into the order, so later changes to the
  // address book or the catalog don't alter it. The total is summed as exact Decimals, never as JavaScript numbers.
  async function create(userId, address, lines, db = prisma) {
    const totalAmount = lines.reduce(
      (sum, { product, quantity }) => sum.plus(product.price.mul(quantity)),
      new Prisma.Decimal(0),
    );
    const order = await db.orders.create({
      data: {
        user_id: userId,
        total_amount: totalAmount,
        shipping_recipient_name: address.recipient_name,
        shipping_phone: address.phone,
        shipping_street: address.street,
        shipping_city: address.city,
        shipping_postal_code: address.postal_code,
        shipping_country: address.country,
        order_items: {
          create: lines.map(({ product, quantity }) => ({
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity,
          })),
        },
      },
      include: INCLUDE,
    });
    return toRow(order);
  }

  async function findById(id, db = prisma) {
    const order = await db.orders.findUnique({ where: { id }, include: INCLUDE });
    return order && toRow(order);
  }

  // Newest first.
  async function list(filters, { limit, offset }, db = prisma) {
    const orders = await db.orders.findMany({
      where: listWhere(filters),
      include: INCLUDE,
      orderBy: { id: 'desc' },
      skip: offset,
      take: limit,
    });
    return orders.map(toRow);
  }

  async function count(filters, db = prisma) {
    return db.orders.count({ where: listWhere(filters) });
  }

  // Row lock held until the surrounding transaction ends; serializes state changes to one order.
  // Raw SQL because Prisma has no FOR UPDATE; tx must be the client from prisma.$transaction().
  // Returns { id, user_id, status, total_amount } with total_amount as a Prisma Decimal, or null when the order
  // doesn't exist.
  async function lockById(id, tx) {
    const [order] = await tx.$queryRaw`SELECT id, user_id, status, total_amount FROM orders WHERE id = ${id} FOR UPDATE`;
    return order ?? null;
  }

  async function updateStatus(id, status, db = prisma) {
    const order = await db.orders.update({ where: { id }, data: { status }, include: INCLUDE });
    return toRow(order);
  }

  // Whether the user has at least one delivered order containing the product.
  async function hasDeliveredProduct(userId, productId, db = prisma) {
    const order = await db.orders.findFirst({
      where: { user_id: userId, status: 'delivered', order_items: { some: { product_id: productId } } },
      select: { id: true },
    });
    return order !== null;
  }

  return { create, findById, list, count, lockById, updateStatus, hasDeliveredProduct };
}
