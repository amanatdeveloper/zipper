import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import {
  describeDatabaseConfig,
  getSafeDiagnosticCode,
  prisma,
} from './prisma.js';

// TEMPORARY DIAGNOSTICS — remove once the production login failure is resolved.
// No credentials, password hashes, tokens, full URLs, or user identifiers are
// logged.
function sanitizeDiagnosticText(value) {
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

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'zipper-ads-engine-dev-secret-key-change-in-production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        let operation = 'input validation';
        const attemptStartedAt = Date.now();
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          console.error('[auth-diag] login attempt', {
            hostname: describeDatabaseConfig(process.env.DATABASE_URL),
            operation: 'authorize',
          });

          operation = 'prisma.user.findUnique';
          const queryStartedAt = Date.now();
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.error('[auth-diag] user lookup completed', {
            operation,
            durationMs: Date.now() - queryStartedAt,
          });

          if (!user) {
            return null;
          }

          operation = 'bcrypt.compare';
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('[auth-diag] auth failure', {
            operation,
            durationMs: Date.now() - attemptStartedAt,
            code: getSafeDiagnosticCode(error),
          });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
