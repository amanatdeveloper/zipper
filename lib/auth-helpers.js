import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route.js';
import { prisma } from './prisma.js';
import { normalizeAuditPrompt } from './page-audit.js';

export const STORE_BASE_SELECT = {
  id: true,
  userId: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  googleClientId: true,
  googleClientSecret: true,
  googleDeveloperToken: true,
  googleRefreshToken: true,
  googleCustomerId: true,
  googleLoginCustomerId: true,
  wooUrl: true,
  wooCk: true,
  wooCs: true,
};

export const STORE_SELECT_WITH_AUDIT_PROMPT = {
  ...STORE_BASE_SELECT,
  auditPrompt: true,
};

export function isMissingStoreAuditPromptColumn(error) {
  return (
    error?.code === 'P2022' &&
    (error?.meta?.column === 'Store.auditPrompt' || String(error?.message || '').includes('Store.auditPrompt'))
  );
}

function attachAuditPromptFallback(store) {
  if (!store) {
    return null;
  }

  return {
    ...store,
    auditPrompt: normalizeAuditPrompt(store.auditPrompt),
  };
}

export async function runStoreOperationWithAuditPrompt(operation) {
  try {
    return attachAuditPromptFallback(await operation(STORE_SELECT_WITH_AUDIT_PROMPT, true));
  } catch (error) {
    if (!isMissingStoreAuditPromptColumn(error)) {
      throw error;
    }

    return attachAuditPromptFallback(await operation(STORE_BASE_SELECT, false));
  }
}

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
    return runStoreOperationWithAuditPrompt((select) =>
      prisma.store.findUnique({
        where: { id: storeId },
        select,
      })
    );
  }

  return runStoreOperationWithAuditPrompt((select) =>
    prisma.store.findFirst({
      where: {
        id: storeId,
        userId: user.id,
      },
      select,
    })
  );
}

export async function getStoreCountForUser(user, options = {}) {
  if (!user?.id) {
    return 0;
  }

  const linkedOnly = options?.linkedOnly === true;

  return prisma.store.count({
    where: linkedOnly || !isSuperAdmin(user) ? { userId: user.id } : {},
  });
}

export async function getDefaultStoreIdForUser(user, options = {}) {
  if (!user?.id) {
    return null;
  }

  const linkedOnly = options?.linkedOnly === true;

  const store = await prisma.store.findFirst({
    where: linkedOnly || !isSuperAdmin(user) ? { userId: user.id } : {},
    select: { id: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  return store?.id || null;
}

export function isSuperAdmin(user) {
  return user?.role === 'SUPER_ADMIN';
}
