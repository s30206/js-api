import { defineConfig } from 'prisma/config';

// Prisma CLI configuration. Like the API, it reads DATABASE_URL from the environment (Docker Compose loads .env);
// Prisma 7 does not load .env by itself. process.env is used instead of env() so `prisma generate`,
// which needs no database, also works where DATABASE_URL is unset (e.g. during `docker build`).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
