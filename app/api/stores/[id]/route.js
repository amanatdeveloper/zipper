import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser, isSuperAdmin } from '../../../../lib/auth-helpers.js';

export async function GET(request, { params }) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const store = await prisma.store.findFirst({
      where: {
        id: id,
        ...(isSuperAdmin(user) ? {} : { userId: user.id }),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userId: true,
        googleClientId: true,
        googleClientSecret: true,
        googleDeveloperToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleLoginCustomerId: true,
        wooUrl: true,
        wooCk: true,
        wooCs: true,
      }
    });

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("Store API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
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
    } = body;

    if (!name || !googleClientId || !googleClientSecret || !googleDeveloperToken || !googleRefreshToken || !googleCustomerId || !googleLoginCustomerId || !wooUrl || !wooCk || !wooCs) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    if (userId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!assignedUser) {
        return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 404 });
      }
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
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
        userId: userId || null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userId: true,
        googleClientId: true,
        googleClientSecret: true,
        googleDeveloperToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleLoginCustomerId: true,
        wooUrl: true,
        wooCk: true,
        wooCs: true,
      },
    });

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error('Update Store API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
