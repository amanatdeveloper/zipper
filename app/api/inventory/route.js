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
    
    // Helper function to fetch all WooCommerce products with pagination
    async function fetchAllWooCommerceProducts(client) {
      const allProducts = [];
      let page = 1;
      const perPage = 100;
      
      while (true) {
        const response = await client.get('products', {
          per_page: perPage,
          page: page,
          status: 'publish'
        });
        
        allProducts.push(...response.data);
        
        // Check if we got less than perPage results (last page)
        if (response.data.length < perPage) {
          break;
        }
        
        page++;
      }
      
      return { data: allProducts };
    }
    
    const response = await fetchAllWooCommerceProducts(wooClient);

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}