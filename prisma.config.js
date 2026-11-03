require('dotenv/config');

// When a Prisma config file is present, the CLI no longer loads `.env`
// automatically, so it is loaded above. Build environments (Cloudflare) only
// expose database secrets at runtime, not during `prisma generate`, so provide
// inert fallbacks to keep schema validation working there. Generate never opens
// a connection; the real values are read from process.env at runtime.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/zipper';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
};
