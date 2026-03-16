import { NextResponse } from 'next/server';
import { getWooCommerceClient } from '../../../lib/api-clients.js';
import { prisma } from '../../../lib/prisma.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'storeId is required'
      }, { status: 400 });
    }

    // Fetch store credentials from database
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    // Fetch WooCommerce Products
    const wooClient = getWooCommerceClient({
      wooUrl: store.wooUrl,
      wooCk: store.wooCk,
      wooCs: store.wooCs,
    });
    const response = await wooClient.get('products', {
      per_page: 100, // Adjust as needed
      status: 'publish' // Only published products
    });

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}