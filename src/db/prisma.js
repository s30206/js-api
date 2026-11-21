import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// Prisma runs its queries through the app's pg pool, so raw SQL and Prisma share one set of connections.
// The adapter never ends a pool it was given: shutdown still only needs pool.end().
export function createPrismaClient({ pool }) {
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
