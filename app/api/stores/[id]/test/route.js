import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma.js';
import {
  getAuthenticatedUser,
  isSuperAdmin,
  runStoreOperationWithAuditPrompt,
} from '../../../../../lib/auth-helpers.js';
import {
  getGoogleAdsAccessToken,
  getGoogleAdsClient,
  getWooCommerceClient,
} from '../../../../../lib/api-clients.js';

async function testWooCommerce(credentials) {
  if (!credentials.wooUrl || !credentials.wooCk || !credentials.wooCs) {
    return { ok: false, errorCode: 'not_configured', message: 'WooCommerce credentials are not set.' };
  }

  try {
    const client = getWooCommerceClient(credentials);
    await client.get('products', { per_page: 1 });

    return { ok: true, message: 'Connected to the store.' };
  } catch (error) {
    return {
      ok: false,
      errorCode: error.code || 'woo_test_failed',
      message: error.message,
      detail: error.detail || null,
    };
  }
}

async function testGoogleAds(credentials) {
  if (!credentials.googleClientId || !credentials.googleClientSecret || !credentials.googleRefreshToken) {
    return { ok: false, errorCode: 'not_configured', message: 'Google Ads credentials are not set.' };
  }

  try {
    await getGoogleAdsAccessToken(credentials);

    if (!credentials.googleCustomerId) {
      return { ok: false, errorCode: 'not_configured', message: 'Google Ads customer ID is not set.' };
    }

    const customer = getGoogleAdsClient(credentials);
    await customer.query('SELECT customer.id, customer.descriptive_name FROM customer');

    return { ok: true, message: 'Connected to Google Ads.' };
  } catch (error) {
    return {
      ok: false,
      errorCode: error.code || 'google_test_failed',
      message: error.message,
      detail: error.detail || null,
    };
  }
}

export async function POST(request, { params }) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    if (!isSuperAdmin(user) && store.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const fullStore = await runStoreOperationWithAuditPrompt((select) =>
      prisma.store.findUnique({
        where: { id },
        select,
      })
    );

    // Credentials sent from the settings form win over the stored ones, so the
    // user can test a change before saving it.
    const body = await request.json().catch(() => ({}));
    const override = body?.credentials || {};

    const woocommerce = await testWooCommerce({
      wooUrl: override.wooUrl ?? fullStore.wooUrl,
      wooCk: override.wooCk ?? fullStore.wooCk,
      wooCs: override.wooCs ?? fullStore.wooCs,
    });

    const googleAds = await testGoogleAds({
      googleClientId: override.googleClientId ?? fullStore.googleClientId,
      googleClientSecret: override.googleClientSecret ?? fullStore.googleClientSecret,
      googleDeveloperToken: override.googleDeveloperToken ?? fullStore.googleDeveloperToken,
      googleRefreshToken: override.googleRefreshToken ?? fullStore.googleRefreshToken,
      googleCustomerId: override.googleCustomerId ?? fullStore.googleCustomerId,
      googleLoginCustomerId: override.googleLoginCustomerId ?? fullStore.googleLoginCustomerId,
    });

    return NextResponse.json({ success: true, data: { woocommerce, googleAds } });
  } catch (error) {
    console.error('Store connection test failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
