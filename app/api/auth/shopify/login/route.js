import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawShop = searchParams.get('shop');

  if (!rawShop) {
    return new NextResponse("Missing shop parameter", { status: 400 });
  }

  const shop = rawShop
    .trim()
    .toLowerCase()
    .replace(/^https?:?\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  if (!shop) {
    return new NextResponse("Invalid shop parameter", { status: 400 });
  }

  if (!shop.endsWith('.myshopify.com')) {
    return new NextResponse("Invalid Shopify domain. Use your-store.myshopify.com", { status: 400 });
  }

  const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
  const SHOPIFY_ADS_CALLBACK_URL = process.env.SHOPIFY_ADS_CALLBACK_URL || `${process.env.NEXTAUTH_URL}/api/auth/shopify/oauth-callback`;
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_ADS_CALLBACK_URL) {
    return new NextResponse("Server configuration error: Missing Shopify environment variables", { status: 500 });
  }

  // Scopes: read_products, read_orders, read_inventory
  const scopes = 'read_products,read_orders,read_inventory';
  // A nonce for CSRF protection. In a real application, you'd generate and store this.
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const redirectUri = new URL(`https://${shop}/admin/oauth/authorize`);
  redirectUri.searchParams.set('client_id', SHOPIFY_CLIENT_ID);
  redirectUri.searchParams.set('scope', scopes);
  redirectUri.searchParams.set('redirect_uri', SHOPIFY_ADS_CALLBACK_URL);
  redirectUri.searchParams.set('state', nonce);

  return NextResponse.redirect(redirectUri);
}
