import { ConflictError, NotFoundError, PaymentDeclinedError } from '../errors/AppError.js';

// viewer is req.user. Customers only ever see their own orders; admins see all of them.
function isAdmin(viewer) {
  return viewer.role === 'admin';
}

// The status an order must be in before an admin can move it to the key status. Cancelling is a separate action.
const REQUIRED_STATUS = { shipped: 'paid', delivered: 'shipped' };

// The statuses each role can cancel an order from.
const CANCELLABLE_STATUSES = { customer: ['pending'], admin: ['pending', 'paid'] };

function productDetails(lines) {
  return lines.map(({ product }) => ({ productId: product.id }));
}

export function createOrderService({
  orderRepository,
  cartRepository,
  productRepository,
  addressRepository,
  userRepository,
  paymentRepository,
  paymentService,
  prisma,
}) {
  // Turns the customer's cart into an order in one transaction: either everything below happens or nothing does.
  async function checkout(userId, addressId) {
    return prisma.$transaction(async (tx) => {
      // Locking the user row serializes the customer's checkouts and cart changes, so one cart can't be
      // ordered twice by concurrent requests.
      await userRepository.lockById(userId, tx);

      const address = await addressRepository.findById(addressId, userId, tx);
      if (!address) throw new NotFoundError('Address not found');

      const { items } = await cartRepository.findByUser(userId, tx);
      if (items.length === 0) throw new ConflictError('CART_EMPTY', 'The cart is empty');

      // Stock, prices and active flags are read again under row locks, so they can't change until the commit.
      const products = await productRepository.lockByIds(items.map((item) => item.product_id), tx);
      const productsById = new Map(products.map((product) => [product.id, product]));
      const lines = items.map(({ product_id, quantity }) => ({ product: productsById.get(product_id), quantity }));

      const unavailable = lines.filter(({ product }) => !product.is_active);
      if (unavailable.length > 0) {
        throw new ConflictError(
          'PRODUCT_UNAVAILABLE',
          'Some products are no longer available',
          productDetails(unavailable),
        );
      }
      const outOfStock = lines.filter(({ product, quantity }) => quantity > product.stock);
      if (outOfStock.length > 0) {
        throw new ConflictError('INSUFFICIENT_STOCK', 'Some products are out of stock', productDetails(outOfStock));
      }

      await productRepository.decrementStock(
        lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        tx,
      );
      const order = await orderRepository.create(userId, address, lines, tx);
      await cartRepository.clear(userId, tx);
      return order;
    });
  }

  // The userId filter is admin only; customers are always limited to their own orders.
  async function list({ page, limit, status, userId }, viewer) {
    const filters = { status, userId: isAdmin(viewer) ? userId : viewer.id };
    const [orders, total] = await Promise.all([
      orderRepository.list(filters, { limit, offset: (page - 1) * limit }),
      orderRepository.count(filters),
    ]);
    return { orders, total };
  }

  // To a customer, another customer's order looks the same as one that doesn't exist.
  async function getById(id, viewer) {
    const order = await orderRepository.findById(id);
    if (!order || (!isAdmin(viewer) && order.user_id !== viewer.id)) throw new NotFoundError('Order not found');
    return order;
  }

  // Customer only: pending -> paid. Every attempt is recorded, so a declined payment's failed row has to commit:
  // the transaction returns null and PaymentDeclinedError is thrown after it, leaving the order pending.
  // The row lock keeps concurrent attempts from paying the same order twice.
  async function pay(id, userId, cardNumber) {
    const paidOrder = await prisma.$transaction(async (tx) => {
      const order = await orderRepository.lockById(id, tx);
      if (!order || order.user_id !== userId) throw new NotFoundError('Order not found');
      if (order.status !== 'pending') {
        throw new ConflictError('INVALID_ORDER_STATE', `Cannot pay for an order that is ${order.status}`);
      }
      const approved = paymentService.charge();
      await paymentRepository.create(
        id,
        {
          amount: order.total_amount,
          status: approved ? 'succeeded' : 'failed',
          cardLast4: cardNumber.slice(-4),
          failureReason: approved ? null : 'CARD_DECLINED',
        },
        tx,
      );
      return approved ? orderRepository.updateStatus(id, 'paid', tx) : null;
    });
    if (!paidOrder) throw new PaymentDeclinedError();
    return paidOrder;
  }

  // Admin only: paid -> shipped and shipped -> delivered. The row lock keeps the status from changing
  // between the check and the update.
  async function updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const order = await orderRepository.lockById(id, tx);
      if (!order) throw new NotFoundError('Order not found');
      if (order.status !== REQUIRED_STATUS[status]) {
        throw new ConflictError('INVALID_ORDER_STATE', `Cannot change an order from ${order.status} to ${status}`);
      }
      return orderRepository.updateStatus(id, status, tx);
    });
  }

  // Customers can cancel their own pending orders; admins can cancel any pending or paid order. The stock of every
  // item is restored, and a paid order's succeeded payment is marked refunded (simulated refund). The row lock keeps
  // the status from changing between the check and the update.
  async function cancel(id, viewer) {
    return prisma.$transaction(async (tx) => {
      const order = await orderRepository.lockById(id, tx);
      if (!order || (!isAdmin(viewer) && order.user_id !== viewer.id)) throw new NotFoundError('Order not found');
      if (!CANCELLABLE_STATUSES[viewer.role].includes(order.status)) {
        throw new ConflictError('INVALID_ORDER_STATE', `Cannot cancel an order that is ${order.status}`);
      }

      const { items } = await orderRepository.findById(id, tx);
      // Locked in id order before the updates, as checkout does, so the two can't deadlock on the same products.
      await productRepository.lockByIds(items.map((item) => item.product_id), tx);
      await productRepository.incrementStock(
        items.map(({ product_id, quantity }) => ({ productId: product_id, quantity })),
        tx,
      );
      if (order.status === 'paid') await paymentRepository.refund(id, tx);
      return orderRepository.updateStatus(id, 'cancelled', tx);
    });
  }

  return { checkout, list, getById, pay, updateStatus, cancel };
}
