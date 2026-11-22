export function createPaymentRepository({ prisma }) {
  // amount is a Prisma Decimal. Only the card's last 4 digits are stored, never the full number.
  async function create(orderId, { amount, status, cardLast4, failureReason }, db = prisma) {
    return db.payments.create({
      data: { order_id: orderId, amount, status, card_last4: cardLast4, failure_reason: failureReason },
    });
  }

  return { create };
}
