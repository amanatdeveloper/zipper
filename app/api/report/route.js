import { NextResponse } from 'next/server';
import { getGoogleAdsClient, getWooCommerceClient } from '../../../lib/api-clients.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Custom Date Range Handling
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

    // Google Ads Format: YYYYMMDD
    const formatDateGoogle = (date) => date.toISOString().split('T')[0].replace(/-/g, '');
    const startGoogle = formatDateGoogle(startDate);
    const endGoogle = formatDateGoogle(endDate);

    // 1. Google Ads Data
    const customer = getGoogleAdsClient();
    const googleQuery = `
      SELECT segments.product_item_id, metrics.clicks, metrics.cost_micros 
      FROM shopping_performance_view 
      WHERE segments.date BETWEEN '${startGoogle}' AND '${endGoogle}'`;
    
    const googleResults = await customer.query(googleQuery);
    
    const googleMap = {};
    for (const row of googleResults) {
      const sku = (row.segments?.product_item_id || '').toLowerCase().trim();
      if (!sku) continue;
      if (!googleMap[sku]) googleMap[sku] = { clicks: 0, cost: 0 };
      googleMap[sku].clicks += row.metrics?.clicks || 0;
      googleMap[sku].cost += (row.metrics?.cost_micros || 0) / 1000000;
    }

    // 2. WooCommerce Data (ISO format)
    const wooClient = getWooCommerceClient();
    const { data: orders } = await wooClient.get('orders', {
      after: startDate.toISOString(),
      before: endDate.toISOString(),
      per_page: 100,
      status: 'processing,completed'
    });

    const wooMap = {};
    for (const order of orders) {
      for (const item of order.line_items || []) {
        const sku = (item.sku || '').toLowerCase().trim();
        if (!sku) continue;
        if (!wooMap[sku]) wooMap[sku] = { rev: 0, count: 0 };
        wooMap[sku].rev += parseFloat(item.total || 0);
        wooMap[sku].count += 1;
      }
    }

    // 3. Merge & Omar's Rules
    const allSkus = new Set([...Object.keys(googleMap), ...Object.keys(wooMap)]);
    const report = Array.from(allSkus).map(sku => {
      const g = googleMap[sku] || { clicks: 0, cost: 0 };
      const w = wooMap[sku] || { rev: 0, count: 0 };
      const acos = w.rev > 0 ? (g.cost / w.rev) * 100 : 0;
      const conv = g.clicks > 0 ? (w.count / g.clicks) * 100 : 0;

      let rec = 'Check Data';
      if (acos < 15 && w.count >= 5) rec = 'Do Nothing (Optimal)';
      else if (acos < 15 && w.count < 5) rec = 'Increase Bid (Growth Opp)';
      else if (acos >= 15 && conv < 1) rec = 'Reduce Bid (Low Efficiency)';
      else if (acos >= 15 && conv >= 1) rec = 'Reduce Price (Price Resistance)';

      return {
        sku: sku.toUpperCase(),
        clicks: g.clicks,
        adCost: g.cost.toFixed(2),
        revenue: w.rev.toFixed(2),
        salesCount: w.count,
        acos: acos.toFixed(2),
        convRate: conv.toFixed(2),
        recommendation: rec
      };
    });

    return NextResponse.json({ success: true, data: report.sort((a,b) => b.revenue - a.revenue) });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}