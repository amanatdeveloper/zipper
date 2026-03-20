import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route.js';
import { prisma } from './prisma.js';

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { session: null, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return { session, user };
}

export async function getAccessibleStore(user, storeId) {
  if (!user || !storeId) return null;

  if (user.role === 'SUPER_ADMIN') {
    return prisma.store.findUnique({
      where: { id: storeId },
    });
  }

  return prisma.store.findFirst({
    where: {
      id: storeId,
      userId: user.id,
    },
  });
}

export function isSuperAdmin(user) {
  return user?.role === 'SUPER_ADMIN';
}
