import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = request.cookies.get('shopify_access_token')?.value;
  const shop = request.cookies.get('shopify_shop_domain')?.value;

  if (!accessToken || !shop) {
    return NextResponse.json(
      { success: false, error: 'Shopify cookies not found. Reconnect Shopify first.' },
      { status: 400 }
    );
  }

  const url = `https://${shop}/admin/api/2024-10/products.json?limit=5`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await res.json();

  return NextResponse.json({
    success: res.ok,
    status: res.status,
    shop,
    count: Array.isArray(data?.products) ? data.products.length : 0,
    products: Array.isArray(data?.products)
      ? data.products.map((p) => ({ id: p.id, title: p.title, handle: p.handle }))
      : [],
    error: res.ok ? null : data,
  });
}
