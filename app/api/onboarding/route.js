import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { getAuthenticatedUser, getStoreCountForUser, runStoreOperationWithAuditPrompt } from '@/lib/auth-helpers.js';

function normalizeWooUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/+$/, '');
}

export async function POST(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'STORE_USER') {
      return NextResponse.json({ success: false, error: 'Only store users can use onboarding' }, { status: 403 });
    }

    const linkedStoreCount = await getStoreCountForUser(user, { linkedOnly: true });

    if (linkedStoreCount > 0) {
      return NextResponse.json({ success: false, error: 'Onboarding has already been completed' }, { status: 409 });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const wooUrl = normalizeWooUrl(body?.wooUrl);
    const wooCk = typeof body?.wooCk === 'string' ? body.wooCk.trim() : '';
    const wooCs = typeof body?.wooCs === 'string' ? body.wooCs.trim() : '';
    const googleCustomerId = typeof body?.googleCustomerId === 'string' ? body.googleCustomerId.trim() : '';
    const googleRefreshToken = typeof body?.googleRefreshToken === 'string' ? body.googleRefreshToken.trim() : '';

    if (!name || !wooUrl || !wooCk || !wooCs || !googleCustomerId || !googleRefreshToken) {
      return NextResponse.json(
        { success: false, error: 'Store name, URL, WooCommerce credentials, Google Ads customer ID, and refresh token are required' },
        { status: 400 }
      );
    }

    const store = await runStoreOperationWithAuditPrompt((select) =>
      prisma.store.create({
        data: {
          userId: user.id,
          name,
          googleClientId: process.env.GOOGLE_CLIENT_ID || '',
          googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          googleDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
          googleRefreshToken,
          googleCustomerId,
          googleLoginCustomerId: googleCustomerId,
          wooUrl,
          wooCk,
          wooCs,
        },
        select,
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: store.id,
          name: store.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
