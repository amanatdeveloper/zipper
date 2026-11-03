import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth-options.js';
import { prisma } from '../../../../../lib/prisma.js';
import { discoverAdvertisingAccounts } from '../../../../../lib/google-ads-accounts.js';

export async function GET(request) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent('Google did not return a complete authorization response')}`
    );
  }

  const onboarding = await prisma.onboardingSession.findFirst({
    where: { state, userId: session.user.id },
  });

  if (!onboarding) {
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent('This Google sign-in attempt has expired. Please try again.')}`
    );
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/google-ads/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(
        `Token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`
      );
    }

    const tokens = await tokenResponse.json();

    // Google only returns a refresh token on the first consent (unless access is
    // revoked), so keep the token already stored for this attempt when absent.
    const refreshToken = tokens.refresh_token || onboarding.googleRefreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token received. Please try again and make sure you grant consent.');
    }

    // Persist the credentials before discovery so a failed lookup can be
    // retried without forcing the user through Google sign-in again.
    await prisma.onboardingSession.update({
      where: { id: onboarding.id },
      data: {
        googleRefreshToken: refreshToken,
        googleError: null,
        status: 'google_connected',
        state: null,
      },
    });

    try {
      const accounts = await discoverAdvertisingAccounts({
        accessToken: tokens.access_token,
        developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      await prisma.onboardingSession.update({
        where: { id: onboarding.id },
        data: { googleAccounts: accounts, googleError: null },
      });
    } catch (discoveryError) {
      const message = `Could not load Google Ads accounts: ${discoveryError.message}`;

      await prisma.onboardingSession
        .update({
          where: { id: onboarding.id },
          data: { googleError: message },
        })
        .catch(() => null);

      return NextResponse.redirect(
        `${baseUrl}/onboarding?google_error=${encodeURIComponent(message)}`
      );
    }

    return NextResponse.redirect(`${baseUrl}/onboarding?google_auth=complete`);
  } catch (err) {
    console.error('Google Ads OAuth callback error:', err.message);
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent(err.message)}`
    );
  }
}
