import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

// Neon's serverless driver can issue queries over HTTP (fetch), which is the
// only transport available inside Cloudflare Workers. Enable it before any
// connection pool is created.
neonConfig.poolQueryViaFetch = true;

export function describeDatabaseConfig(connectionString) {
  if (!connectionString) return null;
  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

const SAFE_DIAGNOSTIC_CODES = new Set([
  '1003',
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1008',
  'P1017',
  'P2021',
  'P2022',
  '28000',
  '28P01',
  '3D000',
]);

export function getSafeDiagnosticCode(error) {
  const candidates = [
    error?.code,
    error?.cause?.code,
    error?.sourceError?.code,
  ];
  return candidates.find(
    (code) => typeof code === 'string' && SAFE_DIAGNOSTIC_CODES.has(code),
  ) ?? null;
}

export function sanitizeDiagnosticText(value) {
  return String(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s"'<>]+/gi, (rawUrl) => {
      try {
        const url = new URL(rawUrl);
        return `${url.protocol}//${url.host}${url.pathname}`;
      } catch {
        return '[REDACTED_URL]';
      }
    })
    .replace(
      /(["']?(?:password|token|secret|authorization|api[_-]?key)["']?\s*[:=]\s*["']?)[^"',}\s]+/gi,
      '$1[REDACTED]',
    )
    .slice(0, 500);
}

function getNeonEndpointHostname(input) {
  const requestUrl =
    typeof input === 'string' || input instanceof URL ? input : input?.url;
  try {
    return new URL(requestUrl).hostname;
  } catch {
    return null;
  }
}

// TEMPORARY DIAGNOSTIC — remove once the production login failure is resolved.
// Never log request details, response bodies, or exception messages.
neonConfig.fetchFunction = async (input, init) => {
  const hostname = getNeonEndpointHostname(input);
  const startedAt = Date.now();
  let response;
  try {
    response = await globalThis.fetch(input, init);
  } catch (error) {
    console.error('[neon-diag] outbound request threw', {
      hostname,
      operation: 'neon.fetch',
      status: null,
      durationMs: Date.now() - startedAt,
      code: getSafeDiagnosticCode(error),
    });
    throw error;
  }

  if (!response.ok) {
    let code = null;
    try {
      const body = await response.clone().text();
      code = body.match(/\berror code:\s*(1003)\b/i)?.[1] ?? null;
    } catch {
      code = null;
    }
    console.error('[neon-diag] outbound request failed', {
      hostname,
      operation: 'neon.fetch',
      status: response.status,
      durationMs: Date.now() - startedAt,
      code,
    });
  }
  return response;
};

const globalForPrisma = globalThis;

function createPrismaClient() {
  // Read lazily so `next build` can evaluate route modules without a database
  // connection. The connection is only opened when a query is executed.
  const connectionString = process.env.DATABASE_URL || '';

  // TEMPORARY DIAGNOSTIC — compare the value captured by Prisma with the
  // request-time value logged in auth-options.js.
  console.error('[prisma-diag] client initialized', {
    hostname: describeDatabaseConfig(connectionString),
    operation: 'prisma.client.initialize',
  });

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
