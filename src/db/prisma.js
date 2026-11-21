import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/index.js';
import { PrismaClient } from '../generated/prisma/client.ts';

export function createPrismaClient() {
  const adapter = new PrismaPg(
    { connectionString: config.databaseUrl },
    // An idle client that loses its connection emits 'error' on the pool; the adapter handles it, this logs it.
    { onPoolError: (err) => console.error('Unexpected PostgreSQL pool error', err) },
  );
  return new PrismaClient({ adapter });
}
