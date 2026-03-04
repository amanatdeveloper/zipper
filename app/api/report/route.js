import { NextResponse } from 'next/server';
import { getGoogleAdsClient, getWooCommerceClient } from '../../../lib/api-clients.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    let startDate = new Date();
    let endDate = new Date();
    
    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const formatDateGoogle = (date) => date.toISOString().split('T')[0].replace(/-/g, '');
    const startGoogle = formatDateGoogle(startDate);
    const endGoogle = formatDateGoogle(endDate);

    // 1. Fetch Google Ads Data (As-Is)
    const customer = getGoogleAdsClient();
    const googleQuery = `
      SELECT segments.product_item_id, metrics.clicks, metrics.cost_micros 
      FROM shopping_performance_view 
      WHERE segments.date BETWEEN '${startGoogle}' AND '${endGoogle}'`;
    
    let googleResults = [];
    try {
      googleResults = await customer.query(googleQuery);
    } catch (gErr) {
      console.error("Google Ads Error:", gErr.message);
      return NextResponse.json({ success: false, error: `Google Ads API: ${gErr.message}` }, { status: 500 });
    }
    
    const googleMap = {};
    for (const row of googleResults) {
      const sku = (row.segments?.product_item_id || '').toLowerCase().trim();
      if (!sku) continue;
      if (!googleMap[sku]) googleMap[sku] = { clicks: 0, cost: 0 };
      googleMap[sku].clicks += row.metrics?.clicks || 0;
      googleMap[sku].cost += (row.metrics?.cost_micros || 0) / 1000000;
    }

    // 2. Fetch WooCommerce Data (DEBUG VERSION)
    try {
      // Directly fetch using URL to test environment variable
      const url = `${process.env.WOO_URL}/wp-json/wc/v3/orders?consumer_key=${process.env.WOO_CK}&consumer_secret=${process.env.WOO_CS}&per_page=5`;
      const res = await fetch(url);
      const data = await res.json();
      console.log("DEBUG WOO RESPONSE:", data);

      // Temporarily return this to see WooCommerce API output
      return NextResponse.json({
        success: true,
        debugWoo: data
      });

    } catch (wErr) {
      console.error("DEBUG WooCommerce Error:", wErr.message);
      return NextResponse.json({
        success: false,
        error: `WooCommerce DEBUG API: ${wErr.message}`
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}