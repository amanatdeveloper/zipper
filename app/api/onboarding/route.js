import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import {
  getAuthenticatedUser,
  getStoreCountForUser,
  runStoreOperationWithAuditPrompt,
} from '../../../lib/auth-helpers.js';
import { getGoogleAdsAccessToken } from '../../../lib/api-clients.js';
import {
  discoverAdvertisingAccounts,
  getEligibleAdvertisingAccounts,
  normalizeCustomerId,
} from '../../../lib/google-ads-accounts.js';

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

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
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
    const onboardingId = readString(body?.onboardingId);
    const selectedCustomerId = normalizeCustomerId(body?.selectedCustomerId);
    const name = readString(body?.name);
    const platform = readString(body?.platform).toLowerCase() || 'woocommerce';
    const wooUrl = normalizeWooUrl(body?.wooUrl);
    const wooCk = readString(body?.wooCk);
    const wooCs = readString(body?.wooCs);
    const shopifyShopDomain = readString(body?.shopifyShopDomain).toLowerCase();
    const shopifyAccessToken = request.cookies.get('shopify_access_token')?.value || '';
    const shopifyShopDomainCookie = request.cookies.get('shopify_shop_domain')?.value || '';

    if (!onboardingId) {
      return NextResponse.json({ success: false, error: 'Onboarding session not found' }, { status: 400 });
    }

    if (!selectedCustomerId) {
      return NextResponse.json({ success: false, error: 'Please select a Google Ads account' }, { status: 400 });
    }

    const onboarding = await prisma.onboardingSession.findFirst({
      where: { id: onboardingId, userId: user.id },
    });

    if (!onboarding) {
      return NextResponse.json({ success: false, error: 'Onboarding session not found' }, { status: 404 });
    }

    if (onboarding.status !== 'google_connected' || !onboarding.googleRefreshToken) {
      return NextResponse.json(
        { success: false, error: 'Confirm your Google Ads account before completing setup' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Store name is required' }, { status: 400 });
    }

    if (platform === 'woocommerce' && (!wooUrl || !wooCk || !wooCs)) {
      return NextResponse.json(
        { success: false, error: 'WooCommerce URL, key, and secret are required for WooCommerce stores' },
        { status: 400 }
      );
    }

    const resolvedShopDomain = platform === 'shopify'
      ? shopifyShopDomainCookie || shopifyShopDomain || onboarding.shopifyShopDomain || ''
      : '';

    if (platform === 'shopify' && (!resolvedShopDomain || !shopifyAccessToken)) {
      return NextResponse.json(
        { success: false, error: 'Please connect Shopify before completing onboarding' },
        { status: 400 }
      );
    }

    // Verify the selected account against Google with the credentials authorized
    // during this onboarding attempt. The submitted ID alone is never trusted.
    let accounts;
    try {
      const accessToken = await getGoogleAdsAccessToken({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        googleRefreshToken: onboarding.googleRefreshToken,
      });

      accounts = await discoverAdvertisingAccounts({
        accessToken,
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Google Ads verification failed: ${error.message}` },
        { status: 502 }
      );
    }

    const selectedAccount = getEligibleAdvertisingAccounts(accounts).find(
      (account) => account.customerId === selectedCustomerId
    );

    if (!selectedAccount) {
      return NextResponse.json(
        {
          success: false,
          error: 'The selected Google Ads account is not accessible with the connected Google account',
        },
        { status: 403 }
      );
    }

    const store = await runStoreOperationWithAuditPrompt((select) =>
      prisma.store.create({
        data: {
          userId: user.id,
          name,
          platform,
          googleClientId: process.env.GOOGLE_CLIENT_ID || '',
          googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          googleDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
          googleRefreshToken: onboarding.googleRefreshToken,
          googleCustomerId: selectedAccount.customerId,
          googleLoginCustomerId: selectedAccount.loginCustomerId || selectedAccount.customerId,
          wooUrl: platform === 'woocommerce' ? wooUrl : '',
          wooCk: platform === 'woocommerce' ? wooCk : '',
          wooCs: platform === 'woocommerce' ? wooCs : '',
          shopifyShopDomain: platform === 'shopify' ? resolvedShopDomain : null,
          shopifyAccessToken: platform === 'shopify' ? shopifyAccessToken : null,
        },
        select,
      })
    );

    await prisma.onboardingSession.deleteMany({ where: { userId: user.id } });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          id: store.id,
          name: store.name,
        },
      },
      { status: 201 }
    );

    if (platform === 'shopify') {
      response.cookies.set('shopify_access_token', '', { path: '/', maxAge: 0 });
      response.cookies.set('shopify_shop_domain', '', { path: '/', maxAge: 0 });
    }

    return response;
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
