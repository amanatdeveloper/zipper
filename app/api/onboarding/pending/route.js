import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser, getStoreCountForUser } from '../../../../lib/auth-helpers.js';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseStep(value) {
  const step = Number.parseInt(value, 10);
  return [1, 2, 3].includes(step) ? step : 1;
}

export async function GET(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const onboarding = await prisma.onboardingSession.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!onboarding) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        onboardingId: onboarding.id,
        step: onboarding.step,
        shopifyConnected: Boolean(request.cookies.get('shopify_shop_domain')?.value),
        storeData: {
          name: onboarding.storeName || '',
          platform: onboarding.platform || 'woocommerce',
          wooUrl: onboarding.wooUrl || '',
          wooCk: onboarding.wooCk || '',
          wooCs: onboarding.wooCs || '',
          shopifyShopDomain: onboarding.shopifyShopDomain || '',
        },
        googleStatus: onboarding.status === 'google_connected' ? 'connected' : 'disconnected',
        googleAccounts: Array.isArray(onboarding.googleAccounts) ? onboarding.googleAccounts : [],
        googleError: onboarding.googleError || '',
        selectedCustomerId: onboarding.selectedCustomerId || '',
      },
    });
  } catch (error) {
    console.error('Onboarding session API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const linkedStoreCount = await getStoreCountForUser(user, { linkedOnly: true });

    if (linkedStoreCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Onboarding has already been completed' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const platform = readString(body?.platform).toLowerCase() || 'woocommerce';

    const data = {
      step: parseStep(body?.step),
      storeName: readString(body?.name),
      platform: ['woocommerce', 'shopify'].includes(platform) ? platform : 'woocommerce',
      wooUrl: readString(body?.wooUrl),
      wooCk: readString(body?.wooCk),
      wooCs: readString(body?.wooCs),
      shopifyShopDomain: readString(body?.shopifyShopDomain).toLowerCase(),
    };

    const existing = await prisma.onboardingSession.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    const onboarding = existing
      ? await prisma.onboardingSession.update({ where: { id: existing.id }, data })
      : await prisma.onboardingSession.create({ data: { userId: user.id, ...data } });

    return NextResponse.json({
      success: true,
      data: { onboardingId: onboarding.id },
    });
  } catch (error) {
    console.error('Onboarding session API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
