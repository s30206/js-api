// Expects { items, total } from the cart service: item rows from the cart repository plus an `available` flag.
export function toCartDto({ items, total }) {
  return {
    items: items.map((item) => ({
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        stock: item.stock,
        isActive: item.is_active,
      },
      quantity: item.quantity,
      lineTotal: item.line_total,
      available: item.available,
    })),
    total,
    currency: 'PLN',
  };
}
