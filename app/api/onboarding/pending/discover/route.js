import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma.js';
import { getAuthenticatedUser } from '../../../../../lib/auth-helpers.js';
import { getGoogleAdsAccessToken } from '../../../../../lib/api-clients.js';
import { discoverAdvertisingAccounts } from '../../../../../lib/google-ads-accounts.js';

export async function POST() {
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
      return NextResponse.json(
        { success: false, error: 'Onboarding session not found' },
        { status: 404 }
      );
    }

    if (!onboarding.googleRefreshToken) {
      return NextResponse.json(
        { success: false, error: 'Google Ads account is not connected yet' },
        { status: 400 }
      );
    }

    try {
      const accessToken = await getGoogleAdsAccessToken({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        googleRefreshToken: onboarding.googleRefreshToken,
      });

      const accounts = await discoverAdvertisingAccounts({
        accessToken,
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      await prisma.onboardingSession.update({
        where: { id: onboarding.id },
        data: { googleAccounts: accounts, googleError: null, status: 'google_connected' },
      });

      return NextResponse.json({ success: true, data: { googleAccounts: accounts } });
    } catch (error) {
      const message = `Could not load Google Ads accounts: ${error.message}`;

      await prisma.onboardingSession
        .update({
          where: { id: onboarding.id },
          data: { googleError: message },
        })
        .catch(() => null);

      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  } catch (error) {
    console.error('Google Ads discovery API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
