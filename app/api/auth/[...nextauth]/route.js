import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../lib/prisma.js';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'zipper-ads-engine-dev-secret-key-change-in-production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('🔍 Auth attempt with:', { email: credentials?.email });
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing email or password');
            return null;
          }

          console.log('🔍 Searching for user:', credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            return null;
          }

          console.log('✅ User found:', { id: user.id, email: user.email });
          console.log('🔍 Comparing password...');
          console.log('Password from input:', credentials.password);
          console.log('Hashed password in DB:', user.password.substring(0, 20) + '...');

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          console.log('Password valid?:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', credentials.email);
            return null;
          }

          console.log('✅ User authenticated:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('❌ Auth error:', error.message, error.stack);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
    }
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
