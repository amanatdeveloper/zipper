import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

// Neon's serverless driver can issue queries over HTTP (fetch), which is the
// only transport available inside Cloudflare Workers. Enable it before any
// connection pool is created.
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis;

function createPrismaClient() {
  // Read lazily so `next build` can evaluate route modules without a database
  // connection. The connection is only opened when a query is executed.
  const connectionString = process.env.DATABASE_URL || '';
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
