import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { getAuthenticatedUser, isSuperAdmin, runStoreOperationWithAuditPrompt } from '../../../lib/auth-helpers.js';
import { normalizeAuditPrompt } from '../../../lib/page-audit.js';

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: isSuperAdmin(user) ? {} : { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userId: true,
      }
    });

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    console.error("Stores API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      googleClientId,
      googleClientSecret,
      googleDeveloperToken,
      googleRefreshToken,
      googleCustomerId,
      googleLoginCustomerId,
      wooUrl,
      wooCk,
      wooCs,
      userId,
      auditPrompt,
    } = body;

    if (!name || !googleClientId || !googleClientSecret || !googleDeveloperToken || !googleRefreshToken || !googleCustomerId || !googleLoginCustomerId || !wooUrl || !wooCk || !wooCs) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    if (userId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!assignedUser) {
        return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 404 });
      }
    }

    const store = await runStoreOperationWithAuditPrompt((select, supportsAuditPrompt) =>
      prisma.store.create({
        data: {
          userId: userId || null,
          name,
          ...(supportsAuditPrompt ? { auditPrompt: normalizeAuditPrompt(auditPrompt) } : {}),
          googleClientId,
          googleClientSecret,
          googleDeveloperToken,
          googleRefreshToken,
          googleCustomerId,
          googleLoginCustomerId,
          wooUrl,
          wooCk,
          wooCs,
        },
        select,
      })
    );

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("Create Store API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
