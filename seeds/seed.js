// Idempotent: runs every time the api container starts (see docker-compose.yml) and is safe to re-run by hand.
//   - Admin: created from ADMIN_EMAIL / ADMIN_PASSWORD if no user with that email exists.
//   - Sample catalog: inserted only when the products table is empty.
import { createPool } from '../src/db/pool.js';
import { hashPassword } from '../src/utils/password.js';
import { brands, categories, products } from './data/catalog.js';

function adminCredentials() {
  const email = (process.env.ADMIN_EMAIL || 'admin@pcshop.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  // Same limits as passwordField() in src/validators/auth.validators.js.
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new Error('ADMIN_PASSWORD is required: 8+ characters, at most 72 bytes');
  }
  return { email, password };
}

async function seedAdmin(client, { email, password }) {
  const { rowCount } = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (rowCount > 0) return false;

  await client.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, 'Admin', 'User', 'admin')`,
    [email, await hashPassword(password)],
  );
  return true;
}

async function seedCatalog(client) {
  const { rowCount } = await client.query('SELECT 1 FROM products LIMIT 1');
  if (rowCount > 0) return false;

  const categoryIds = new Map();
  for (const { name, slug, description } of categories) {
    const { rows } = await client.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id',
      [name, slug, description],
    );
    categoryIds.set(slug, rows[0].id);
  }

  const brandIds = new Map();
  for (const name of brands) {
    const { rows } = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [name]);
    brandIds.set(name, rows[0].id);
  }

  for (const p of products) {
    await client.query(
      `INSERT INTO products (category_id, brand_id, sku, name, description, price, stock, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [categoryIds.get(p.category), brandIds.get(p.brand), p.sku, p.name, p.description, p.price, p.stock, p.specs],
    );
  }
  return true;
}

const admin = adminCredentials();
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const adminCreated = await seedAdmin(client, admin);
  const catalogSeeded = await seedCatalog(client);
  await client.query('COMMIT');

  console.log(adminCreated ? `Admin ${admin.email} created` : `Admin ${admin.email} already exists, skipped`);
  console.log(
    catalogSeeded
      ? `Catalog seeded: ${categories.length} categories, ${brands.length} brands, ${products.length} products`
      : 'Products already exist, catalog skipped',
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
