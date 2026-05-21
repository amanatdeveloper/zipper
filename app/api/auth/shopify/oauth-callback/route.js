import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import crypto from 'crypto';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const state = searchParams.get('state'); // This would be used to validate against the nonce saved earlier

  if (!code || !shop || !hmac) {
    return new NextResponse("Missing required parameters from Shopify callback", { status: 400 });
  }

  const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
  if (!SHOPIFY_CLIENT_SECRET) {
    return new NextResponse("Server configuration error: Missing Shopify client secret", { status: 500 });
  }

  // Validate HMAC
  const map = Array.from(searchParams.entries())
    .filter(([key, value]) => key !== 'hmac' && key !== 'signature')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(map)
    .digest('hex');

  if (generatedHash !== hmac) {
    return new NextResponse("HMAC validation failed", { status: 403 });
  }

  try {
    // Exchange authorization code for a permanent access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Failed to get Shopify access token:", errorData);
      return new NextResponse(`Failed to get access token: ${errorData.error_description || tokenResponse.statusText}`, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new NextResponse("Shopify access token not received", { status: 500 });
    }

    // Store token in secure cookie for onboarding completion step.
    const redirectUrl = new URL('/dashboard/onboarding?shopify_connected=true', request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('shopify_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30,
    });
    response.cookies.set('shopify_shop_domain', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30,
    });
    return response;

  } catch (error) {
    console.error("Error during Shopify OAuth callback:", error);
    return new NextResponse("Internal server error during Shopify OAuth", { status: 500 });
  }
}
