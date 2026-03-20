import { NextResponse } from 'next/server';
import { getGoogleAdsClient, getWooCommerceClient } from '../../../lib/api-clients.js';
import { prisma } from '../../../lib/prisma.js';
import { getAuthenticatedUser, getAccessibleStore } from '../../../lib/auth-helpers.js';

export const dynamic = 'force-dynamic';
const LEARNING_PERIOD_DAYS = 14;

// Helper function to normalize SKUs: case-insensitive, trimmed, remove extra spaces
function normalizeSku(sku) {
  if (!sku || typeof sku !== 'string') return '';
  return sku.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function fetchOptimizationLogs(storeId, learningPeriodStart) {
  if (!prisma.optimizationLog?.findMany) {
    console.warn('OptimizationLog Prisma client is not generated yet. Returning empty learning-phase data.');
    return [];
  }

  try {
    return await prisma.optimizationLog.findMany({
      where: {
        storeId,
        appliedAt: {
          gte: learningPeriodStart,
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  } catch (error) {
    console.warn('OptimizationLog lookup failed. Returning empty learning-phase data.', error.message);
    return [];
  }
}

export async function GET(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'storeId is required' 
      }, { status: 400 });
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found or access denied'
      }, { status: 404 });
    }

    const learningPeriodStart = new Date();
    learningPeriodStart.setDate(learningPeriodStart.getDate() - LEARNING_PERIOD_DAYS);

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

    // Initialize API clients
    const customer = getGoogleAdsClient({
      googleClientId: store.googleClientId,
      googleClientSecret: store.googleClientSecret,
      googleDeveloperToken: store.googleDeveloperToken,
      googleCustomerId: store.googleCustomerId,
      googleLoginCustomerId: store.googleLoginCustomerId,
      googleRefreshToken: store.googleRefreshToken,
    });

    const wooClient = getWooCommerceClient({
      wooUrl: store.wooUrl,
      wooCk: store.wooCk,
      wooCs: store.wooCs,
    });

    // Google Ads query
    const googleQuery = `
      SELECT
        segments.product_item_id,
        metrics.clicks,
        metrics.cost_micros
      FROM shopping_performance_view
      WHERE segments.date BETWEEN '${startGoogle}' AND '${endGoogle}'
    `;

    // 1. Fetch Google Ads Data and WooCommerce Data in parallel
    const [googleResults, wooOrdersResponse, wooProductsResponse, optimizationLogs] = await Promise.all([
      customer.query(googleQuery),
      wooClient.get('orders', {
        after: startDate.toISOString(),
        before: endDate.toISOString(),
        per_page: 100,
        status: 'processing,completed'
      }),
      fetchAllWooCommerceProducts(wooClient),
      fetchOptimizationLogs(storeId, learningPeriodStart),
    ]);

    // Process Google Ads data
    const googleMap = {};
    for (const row of googleResults) {
      const sku = normalizeSku(row.segments?.product_item_id || '');
      if (!sku) continue;
      if (!googleMap[sku]) googleMap[sku] = { clicks: 0, cost: 0 };
      googleMap[sku].clicks += parseInt(row.metrics?.clicks || 0);
      googleMap[sku].cost += (parseFloat(row.metrics?.cost_micros || 0) / 1000000);
    }

    // Process WooCommerce Orders data
    const wooMap = {};
    for (const order of wooOrdersResponse.data) {
      for (const item of order.line_items || []) {
        const sku = normalizeSku(item.sku || '');
        if (!sku) continue;
        if (!wooMap[sku]) wooMap[sku] = { rev: 0, count: 0 };
        wooMap[sku].rev += parseFloat(item.total || 0);
        wooMap[sku].count += 1;
      }
    }

    // Process WooCommerce Products data for inventory
    const inventoryMap = {};
    for (const product of wooProductsResponse.data) {
      const sku = normalizeSku(product.sku || '');
      if (!sku) continue;
      inventoryMap[sku] = {
        stock_status: product.stock_status || 'outofstock',
        stock_quantity: parseInt(product.stock_quantity || 0),
        price: parseFloat(product.price || 0)
      };
    }

    const optimizationMap = {};
    for (const log of optimizationLogs) {
      const sku = normalizeSku(log.sku);
      if (!sku || optimizationMap[sku]) continue;
      optimizationMap[sku] = log;
    }

    // 3. Final Merge
    const allSkus = new Set([...Object.keys(googleMap), ...Object.keys(wooMap), ...Object.keys(inventoryMap)]);
    const report = Array.from(allSkus).map(sku => {
      const g = googleMap[sku] || { clicks: 0, cost: 0 };
      const w = wooMap[sku] || { rev: 0, count: 0 };
      const inv = inventoryMap[sku] || { stock_status: 'unknown', stock_quantity: 0, price: 0 };
      const optimizationLog = optimizationMap[sku] || null;
      const acos = w.rev > 0 ? (g.cost / w.rev) * 100 : 0;
      const convRate = g.clicks > 0 ? (w.count / g.clicks) * 100 : 0;

      return {
        sku: sku.toUpperCase(),
        clicks: g.clicks,
        adCost: g.cost.toFixed(2),
        revenue: w.rev.toFixed(2),
        salesCount: w.count,
        acos: acos.toFixed(2),
        convRate: convRate.toFixed(2),
        stock_status: inv.stock_status,
        stock_quantity: inv.stock_quantity,
        price: inv.price.toFixed(2),
        learningPhase: Boolean(optimizationLog),
        optimizedAt: optimizationLog?.appliedAt || null,
        actionTaken: optimizationLog?.actionTaken || null
      };
    });

    // Filter to show only products with clicks > 0 or salesCount > 0
    const filteredReport = report.filter(item => 
      parseInt(item.clicks) > 0 || parseInt(item.salesCount) > 0
    );

    return NextResponse.json({ 
      success: true, 
      data: filteredReport.sort((a, b) => b.clicks - a.clicks) 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
