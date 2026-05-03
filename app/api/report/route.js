import { NextResponse } from 'next/server';
import { getGoogleAdsClient, getWooCommerceClient } from '../../../lib/api-clients.js';
import { prisma } from '../../../lib/prisma.js';
import { getAccessibleStore, getAuthenticatedUser } from '../../../lib/auth-helpers.js';
import { isMissingProductMetaStorage, normalizeSku } from '../../../lib/product-meta.js';

export const dynamic = 'force-dynamic';

const LEARNING_PERIOD_DAYS = 14;
const DEFAULT_REPORT_WINDOW_DAYS = 30;
const TRAILING_SALES_WINDOW_DAYS = 30;
const WOO_ORDER_FETCH_BUFFER_DAYS = 1;
const RELEVANT_WOO_ORDER_STATUSES = ['processing', 'completed', 'on-hold'];

const AUDIT_ACTION_LABELS = {
  'Customer reviews or testimonials': 'Add Reviews',
  'Product video or demo': 'Add Video',
  'Trust badges or secure payment cues': 'Add Trust Badges',
  'Warranty or guarantee messaging': 'Add Warranty',
  'Shipping clarity': 'Clarify Shipping',
  'Returns or risk-reversal policy': 'Clarify Returns',
  'FAQ or objection handling': 'Add FAQ',
  'Comparison, size, or spec chart': 'Add Comparison',
};

function parseDateParam(value, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateParam(date) {
  return date.toISOString().split('T')[0];
}

function shiftDateParam(value, days) {
  const date = parseDateParam(value, false);

  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return formatDateParam(date);
}

function getDefaultDateRange() {
  const today = new Date();
  const endDateParam = formatDateParam(today);
  const startDate = parseDateParam(endDateParam, false);
  startDate.setUTCDate(startDate.getUTCDate() - (DEFAULT_REPORT_WINDOW_DAYS - 1));

  return {
    startDateParam: formatDateParam(startDate),
    endDateParam,
  };
}

function formatDateGoogle(value) {
  return value.replace(/-/g, '');
}

function getOrderDateParam(order) {
  return String(order?.date_created || order?.date_created_gmt || '').slice(0, 10);
}

function isOrderWithinRange(order, startDateParam, endDateParam) {
  const orderDateParam = getOrderDateParam(order);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDateParam)) {
    return false;
  }

  return orderDateParam >= startDateParam && orderDateParam <= endDateParam;
}

function buildSalesMap(orders, startDateParam, endDateParam) {
  const salesMap = {};

  for (const order of orders) {
    if (!isOrderWithinRange(order, startDateParam, endDateParam)) {
      continue;
    }

    for (const item of order.line_items || []) {
      const sku = normalizeSku(item.sku || '');

      if (!sku) {
        continue;
      }

      const quantity = Math.max(parseInt(item.quantity || 0, 10) || 0, 1);

      if (!salesMap[sku]) {
        salesMap[sku] = { rev: 0, count: 0 };
      }

      salesMap[sku].rev += parseFloat(item.total || 0);
      salesMap[sku].count += quantity;
    }
  }

  return salesMap;
}

function extractAuditMissingElements(checklist) {
  if (!Array.isArray(checklist)) {
    return [];
  }

  return Array.from(
    new Set(
      checklist
        .filter((item) => item?.status === 'missing')
        .map((item) => AUDIT_ACTION_LABELS[item.label] || item.label)
        .filter(Boolean)
    )
  );
}

function isMissingPageAuditStorage(error) {
  return (
    error?.code === 'P2021' &&
    (String(error?.meta?.table || '').includes('PageAudit') || String(error?.message || '').includes('PageAudit'))
  );
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

async function fetchProductMetaRecords(storeId) {
  try {
    return await prisma.productMeta.findMany({
      where: { storeId },
    });
  } catch (error) {
    if (isMissingProductMetaStorage(error)) {
      return [];
    }

    throw error;
  }
}

async function fetchLatestPageAudits(storeId) {
  try {
    return await prisma.pageAudit.findMany({
      where: { storeId },
      select: {
        sku: true,
        score: true,
        checklist: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    if (isMissingPageAuditStorage(error)) {
      return [];
    }

    throw error;
  }
}

async function fetchAllWooCommerceProducts(client) {
  const allProducts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await client.get('products', {
      per_page: perPage,
      page,
      status: 'publish',
    });

    allProducts.push(...response.data);

    if (response.data.length < perPage) {
      break;
    }

    page += 1;
  }

  return { data: allProducts };
}

async function fetchAllWooCommerceOrders(client, startBoundary, endBoundary) {
  const allOrders = [];
  let page = 1;
  const perPage = 100;
  const after = new Date(
    startBoundary.getTime() - WOO_ORDER_FETCH_BUFFER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const before = new Date(
    endBoundary.getTime() + WOO_ORDER_FETCH_BUFFER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  while (true) {
    const response = await client.get('orders', {
      after,
      before,
      order: 'asc',
      orderby: 'date',
      page,
      per_page: perPage,
      status: RELEVANT_WOO_ORDER_STATUSES.join(','),
    });

    allOrders.push(...response.data);

    if (response.data.length < perPage) {
      break;
    }

    page += 1;
  }

  return { data: allOrders };
}

export async function GET(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const requestedStartDateParam = searchParams.get('start')?.trim() || '';
    const requestedEndDateParam = searchParams.get('end')?.trim() || '';
    const showAllProducts = searchParams.get('showAll') === 'true';
    const showArchived = searchParams.get('showArchived') === 'true';

    if (!storeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'storeId is required',
        },
        { status: 400 }
      );
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: 'Store not found or access denied',
        },
        { status: 404 }
      );
    }

    const { startDateParam, endDateParam } =
      requestedStartDateParam && requestedEndDateParam
        ? {
            startDateParam: requestedStartDateParam,
            endDateParam: requestedEndDateParam,
          }
        : getDefaultDateRange();

    const startBoundary = parseDateParam(startDateParam, false);
    const endBoundary = parseDateParam(endDateParam, true);

    if (!startBoundary || !endBoundary || startBoundary > endBoundary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid start and end dates are required in YYYY-MM-DD format',
        },
        { status: 400 }
      );
    }

    const trailingStartDateParam = shiftDateParam(endDateParam, -(TRAILING_SALES_WINDOW_DAYS - 1));
    const trailingStartBoundary = parseDateParam(trailingStartDateParam, false);

    const learningPeriodStart = new Date();
    learningPeriodStart.setDate(learningPeriodStart.getDate() - LEARNING_PERIOD_DAYS);

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

    const googleQuery = `
      SELECT
        segments.product_item_id,
        metrics.clicks,
        metrics.cost_micros
      FROM shopping_performance_view
      WHERE segments.date BETWEEN '${formatDateGoogle(startDateParam)}' AND '${formatDateGoogle(endDateParam)}'
    `;

    const [
      googleResults,
      selectedOrdersResponse,
      trailingOrdersResponse,
      wooProductsResponse,
      optimizationLogs,
      productMetaRecords,
      latestPageAudits,
    ] = await Promise.all([
      customer.query(googleQuery),
      fetchAllWooCommerceOrders(wooClient, startBoundary, endBoundary),
      fetchAllWooCommerceOrders(wooClient, trailingStartBoundary, endBoundary),
      fetchAllWooCommerceProducts(wooClient),
      fetchOptimizationLogs(storeId, learningPeriodStart),
      fetchProductMetaRecords(storeId),
      fetchLatestPageAudits(storeId),
    ]);

    const googleMap = {};
    for (const row of googleResults) {
      const sku = normalizeSku(row.segments?.product_item_id || '');

      if (!sku) {
        continue;
      }

      if (!googleMap[sku]) {
        googleMap[sku] = { clicks: 0, cost: 0 };
      }

      googleMap[sku].clicks += parseInt(row.metrics?.clicks || 0, 10);
      googleMap[sku].cost += parseFloat(row.metrics?.cost_micros || 0) / 1000000;
    }

    const wooMap = buildSalesMap(selectedOrdersResponse.data, startDateParam, endDateParam);
    const trailingSalesMap = buildSalesMap(
      trailingOrdersResponse.data,
      trailingStartDateParam,
      endDateParam
    );

    const inventoryMap = {};
    for (const product of wooProductsResponse.data) {
      const sku = normalizeSku(product.sku || '');

      if (!sku) {
        continue;
      }

      inventoryMap[sku] = {
        productName: product.name || '',
        productUrl: product.permalink || '',
        price: parseFloat(product.price || 0),
        stock_quantity: parseInt(product.stock_quantity || 0, 10) || 0,
        stock_status: product.stock_status || 'outofstock',
      };
    }

    const optimizationMap = {};
    for (const log of optimizationLogs) {
      const sku = normalizeSku(log.sku);

      if (!sku || optimizationMap[sku]) {
        continue;
      }

      optimizationMap[sku] = log;
    }

    const productMetaMap = {};
    for (const record of productMetaRecords) {
      const sku = normalizeSku(record.normalizedSku || record.sku);

      if (!sku) {
        continue;
      }

      productMetaMap[sku] = {
        costPrice: record.costPrice,
        leadTime: record.leadTime,
        minSalesTarget: record.minSalesTarget,
        isHidden: record.isHidden || false,
      };
    }

    const latestAuditMap = {};
    for (const audit of latestPageAudits) {
      const sku = normalizeSku(audit.sku);

      if (!sku || latestAuditMap[sku]) {
        continue;
      }

      latestAuditMap[sku] = {
        createdAt: audit.createdAt,
        missingElements: audit.score < 90 ? extractAuditMissingElements(audit.checklist) : [],
        score: audit.score,
      };
    }

    const allSkus = new Set([
      ...Object.keys(googleMap),
      ...Object.keys(wooMap),
      ...Object.keys(trailingSalesMap),
      ...Object.keys(inventoryMap),
      ...Object.keys(productMetaMap),
    ]);

    const report = Array.from(allSkus).map((sku) => {
      const googleMetrics = googleMap[sku] || { clicks: 0, cost: 0 };
      const salesMetrics = wooMap[sku] || { rev: 0, count: 0 };
      const trailingSales = trailingSalesMap[sku] || { rev: 0, count: 0 };
      const inventory = inventoryMap[sku] || {
        productName: '',
        productUrl: '',
        price: 0,
        stock_quantity: 0,
        stock_status: 'unknown',
      };
      const productMeta = productMetaMap[sku] || {
        costPrice: 0,
        leadTime: 0,
        minSalesTarget: 0,
        isHidden: false,
      };
      const optimizationLog = optimizationMap[sku] || null;
      const latestAudit = latestAuditMap[sku] || null;
      const acos = salesMetrics.rev > 0 ? (googleMetrics.cost / salesMetrics.rev) * 100 : 0;
      const convRate = googleMetrics.clicks > 0 ? (salesMetrics.count / googleMetrics.clicks) * 100 : 0;
      const safeUnitCost = Number.isFinite(Number(productMeta.costPrice))
        ? Number(productMeta.costPrice)
        : 0;
      const totalCogs = safeUnitCost * salesMetrics.count;
      const adCostPerSale =
        salesMetrics.count > 0 ? googleMetrics.cost / salesMetrics.count : null;
      const profitPerSale =
        adCostPerSale === null ? null : inventory.price - (safeUnitCost + adCostPerSale);
      const totalProfit = salesMetrics.rev - googleMetrics.cost - totalCogs;
      const stockDaysRemaining =
        inventory.stock_quantity <= 0
          ? 0
          : trailingSales.count > 0
            ? inventory.stock_quantity / (trailingSales.count / TRAILING_SALES_WINDOW_DAYS)
            : null;

      return {
        actionTaken: optimizationLog?.actionTaken || null,
        acos: acos.toFixed(2),
        adCost: googleMetrics.cost.toFixed(2),
        adCostPerSale: adCostPerSale === null ? null : adCostPerSale.toFixed(2),
        auditMissingElements: latestAudit?.missingElements || [],
        auditScore: latestAudit?.score ?? null,
        clicks: googleMetrics.clicks,
        convRate: convRate.toFixed(2),
        costPrice: Number(productMeta.costPrice || 0).toFixed(2),
        isHidden: productMeta.isHidden || false,
        latestAuditAt: latestAudit?.createdAt || null,
        leadTime: productMeta.leadTime || 0,
        learningPhase: Boolean(optimizationLog),
        minSalesTarget: productMeta.minSalesTarget || 0,
        optimizedAt: optimizationLog?.appliedAt || null,
        price: inventory.price.toFixed(2),
        productName: inventory.productName,
        productUrl: inventory.productUrl,
        profitPerSale: profitPerSale === null ? null : profitPerSale.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        revenue: salesMetrics.rev.toFixed(2),
        salesCount: salesMetrics.count,
        salesLast30: trailingSales.count,
        sku: sku.toUpperCase(),
        stock_quantity: inventory.stock_quantity,
        stock_status: inventory.stock_status,
        stockDaysRemaining:
          stockDaysRemaining === null ? null : Number(stockDaysRemaining.toFixed(1)),
      };
    });

    let filteredReport = report.filter(
      (item) => parseInt(item.clicks, 10) > 0 || parseInt(item.salesCount, 10) > 0
    );

    // Filter by ad spend > 0 by default, unless showAllProducts is true
    if (!showAllProducts) {
      filteredReport = filteredReport.filter((item) => parseFloat(item.adCost) > 0);
    }

    // Exclude hidden products unless showArchived is true
    if (!showArchived) {
      filteredReport = filteredReport.filter((item) => !item.isHidden);
    }

    return NextResponse.json({
      success: true,
      data: filteredReport.sort((a, b) => b.clicks - a.clicks),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
