// Expects a row from the product repository, which joins the category, brand and review aggregate.
import { config } from '../config/index.js';

export function toProductDto(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: config.currency,
    stock: product.stock,
    isActive: product.is_active,
    category: { id: product.category_id, name: product.category_name, slug: product.category_slug },
    brand: { id: product.brand_id, name: product.brand_name },
    specs: product.specs,
    rating: { average: product.rating_average, count: product.rating_count },
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}
