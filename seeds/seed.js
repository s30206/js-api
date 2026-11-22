// Idempotent: runs every time the api container starts (see docker-compose.yml) and is safe to re-run by hand.
//   - Admin: created from ADMIN_EMAIL / ADMIN_PASSWORD if no user with that email exists.
//   - Sample catalog: inserted only when the products table is empty.
import { createPrismaClient } from '../src/db/prisma.js';
import { hashPassword } from '../src/utils/password.js';
import { brands, categories, products } from './data/catalog.js';

function adminCredentials() {
  const email = (process.env.ADMIN_EMAIL || 'admin@pcshop.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  // Same limits as passwordField() in src/validators/common.validators.js.
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new Error('ADMIN_PASSWORD is required: 8+ characters, at most 72 bytes');
  }
  return { email, password };
}

async function seedAdmin(tx, { email, password }) {
  if (await tx.users.findUnique({ where: { email }, select: { id: true } })) return false;

  await tx.users.create({
    data: {
      email,
      password_hash: await hashPassword(password),
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    },
  });
  return true;
}

async function seedCatalog(tx) {
  if (await tx.products.findFirst({ select: { id: true } })) return false;

  const createdCategories = await tx.categories.createManyAndReturn({
    data: categories,
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(createdCategories.map(({ id, slug }) => [slug, id]));

  const createdBrands = await tx.brands.createManyAndReturn({
    data: brands.map((name) => ({ name })),
    select: { id: true, name: true },
  });
  const brandIds = new Map(createdBrands.map(({ id, name }) => [name, id]));

  await tx.products.createMany({
    data: products.map((p) => ({
      category_id: categoryIds.get(p.category),
      brand_id: brandIds.get(p.brand),
      sku: p.sku,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      specs: p.specs,
    })),
  });
  return true;
}

const admin = adminCredentials();
const prisma = createPrismaClient();
try {
  const { adminCreated, catalogSeeded } = await prisma.$transaction(async (tx) => ({
    adminCreated: await seedAdmin(tx, admin),
    catalogSeeded: await seedCatalog(tx),
  }));

  console.log(adminCreated ? `Admin ${admin.email} created` : `Admin ${admin.email} already exists, skipped`);
  console.log(
    catalogSeeded
      ? `Catalog seeded: ${categories.length} categories, ${brands.length} brands, ${products.length} products`
      : 'Products already exist, catalog skipped',
  );
}
catch (err) {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
} 
finally {
  await prisma.$disconnect();
}
