// Expects a row from the order repository, which includes the order's items and payment attempts.
import { config } from '../config/index.js';

export function toOrderDto(order) {
  return {
    id: order.id,
    userId: order.user_id,
    status: order.status,
    items: order.items.map((item) => ({
      product: { id: item.product_id, name: item.product_name },
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    })),
    totalAmount: order.total_amount,
    currency: config.currency,
    shippingAddress: {
      recipientName: order.shipping_recipient_name,
      phone: order.shipping_phone,
      street: order.shipping_street,
      city: order.shipping_city,
      postalCode: order.shipping_postal_code,
      country: order.shipping_country,
    },
    payments: order.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      cardLast4: payment.card_last4,
      failureReason: payment.failure_reason,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    })),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}
