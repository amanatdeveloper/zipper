import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'node:crypto';
import { authOptions } from '../../../../../lib/auth-options.js';
import { prisma } from '../../../../../lib/prisma.js';

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${baseUrl}/api/auth/google-ads/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent('Google OAuth is not configured')}`
    );
  }

  const onboarding = await prisma.onboardingSession.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  if (!onboarding) {
    return NextResponse.redirect(
      `${baseUrl}/onboarding?google_error=${encodeURIComponent('Your store details were not saved. Please start again.')}`
    );
  }

  const state = randomBytes(32).toString('hex');

  await prisma.onboardingSession.update({
    where: { id: onboarding.id },
    data: { state, status: 'pending', googleError: null },
  });

  const scope = 'https://www.googleapis.com/auth/adwords';

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `response_type=code&` +
    `state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
