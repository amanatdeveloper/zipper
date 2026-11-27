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

// WooCommerce returns `date_created_gmt` without a timezone suffix, so treat a
// bare datetime as UTC to compare exactly against the optimization timestamp.
function getOrderTimestamp(order) {
  const raw = order?.date_created_gmt || order?.date_created || '';

  if (!raw) {
    return NaN;
  }

  return new Date(/T\d{2}:\d{2}:\d{2}$/.test(raw) ? `${raw}Z` : raw).getTime();
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

// Single source of truth for the metric math. Row 1 (selected range) and the
// "Since Optimized" sub-row both run through this so ACOS, conversion, ad cost
// per sale and profit are identical by construction.
function computeMetrics(googleMetrics, salesMetrics, trailingSales, inventory, productMeta) {
  const acos = salesMetrics.rev > 0 ? (googleMetrics.cost / salesMetrics.rev) * 100 : 0;
  const convRate =
    googleMetrics.clicks > 0 ? (salesMetrics.count / googleMetrics.clicks) * 100 : 0;
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
    acos: acos.toFixed(2),
    adCost: googleMetrics.cost.toFixed(2),
    adCostPerSale: adCostPerSale === null ? null : adCostPerSale.toFixed(2),
    clicks: googleMetrics.clicks,
    convRate: convRate.toFixed(2),
    profitPerSale: profitPerSale === null ? null : profitPerSale.toFixed(2),
    revenue: salesMetrics.rev.toFixed(2),
    salesCount: salesMetrics.count,
    stockDaysRemaining:
      stockDaysRemaining === null ? null : Number(stockDaysRemaining.toFixed(1)),
    totalProfit: totalProfit.toFixed(2),
  };
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

async function fetchOptimizationLogs(storeId) {
  if (!prisma.optimizationLog?.findMany) {
    console.warn('OptimizationLog Prisma client is not generated yet. Returning empty optimization data.');
    return [];
  }

  try {
    return await prisma.optimizationLog.findMany({
      where: { storeId },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  } catch (error) {
    console.warn('OptimizationLog lookup failed. Returning empty optimization data.', error.message);
    return [];
  }
}

async function fetchOptimizationHistory(storeId) {
  if (!prisma.optimizationHistory?.findMany) {
    return [];
  }

  try {
    return await prisma.optimizationHistory.findMany({
      where: { storeId },
      orderBy: {
        snapshotDate: 'desc',
      },
    });
  } catch (error) {
    console.warn('OptimizationHistory lookup failed. Returning empty optimization notes.', error.message);
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

  // The /products endpoint only exposes parent SKUs; variable products list
  // their children as IDs (`variations: [105, 104]`). Fetch each child so
  // variation-level SKUs (used by some Merchant Center feeds) are matchable.
  const variableProducts = allProducts.filter(
    (product) =>
      product.type === 'variable' &&
      Array.isArray(product.variations) &&
      product.variations.length > 0
  );

  for (const product of variableProducts) {
    let variationPage = 1;

    while (true) {
      const response = await client.get(`products/${product.id}/variations`, {
        per_page: perPage,
        page: variationPage,
      });

      for (const variation of response.data) {
        allProducts.push({
          ...variation,
          name: product.name,
          permalink: product.permalink,
        });
      }

      if (response.data.length < perPage) {
        break;
      }

      variationPage += 1;
    }
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

// Aggregates WooCommerce line items per SKU using each SKU's own optimization
// timestamp, so products optimized on different days are measured from their
// respective starting points.
function buildSinceOptimizedSalesMap(orders, latestOptimizedMap) {
  const salesMap = {};

  for (const order of orders) {
    const orderTime = getOrderTimestamp(order);

    if (!Number.isFinite(orderTime)) {
      continue;
    }

    for (const item of order.line_items || []) {
      const sku = normalizeSku(item.sku || '');
      const optimized = latestOptimizedMap[sku];

      if (!sku || !optimized) {
        continue;
      }

      if (orderTime < new Date(optimized.optimizedAt).getTime()) {
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

// Google Ads only exposes daily granularity, so each SKU is measured from the
// calendar day of its latest optimization through today.
async function fetchSinceOptimizedGoogleMetrics(customer, latestOptimizedMap) {
  const optimizedSkus = Object.keys(latestOptimizedMap);

  if (optimizedSkus.length === 0) {
    return {};
  }

  const earliestOptimizedTime = optimizedSkus.reduce((earliest, sku) => {
    const time = new Date(latestOptimizedMap[sku].optimizedAt).getTime();
    return time < earliest ? time : earliest;
  }, Infinity);

  const startDateParam = formatDateParam(new Date(earliestOptimizedTime));
  const endDateParam = formatDateParam(new Date());

  const sinceQuery = `
    SELECT
      segments.date,
      segments.product_item_id,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '${formatDateGoogle(startDateParam)}' AND '${formatDateGoogle(endDateParam)}'
  `;

  const sinceResults = await customer.query(sinceQuery);
  const googleMap = {};

  for (const row of sinceResults) {
    const sku = normalizeSku(
      row.segments?.product_item_id || row.segments?.productItemId || ''
    );
    const optimized = latestOptimizedMap[sku];

    if (!sku || !optimized) {
      continue;
    }

    const rowDate = row.segments?.date;

    if (!rowDate) {
      continue;
    }

    const optimizedDateParam = formatDateParam(new Date(optimized.optimizedAt));

    if (rowDate < optimizedDateParam) {
      continue;
    }

    if (!googleMap[sku]) {
      googleMap[sku] = { clicks: 0, impressions: 0, cost: 0 };
    }

    googleMap[sku].clicks += parseInt(row.metrics?.clicks || 0, 10);
    googleMap[sku].impressions += parseInt(row.metrics?.impressions || 0, 10);
    googleMap[sku].cost +=
      parseFloat(row.metrics?.cost_micros || row.metrics?.costMicros || 0) / 1000000;
  }

  return googleMap;
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
      optimizationHistory,
      productMetaRecords,
      latestPageAudits,
    ] = await Promise.all([
      customer.query(googleQuery),
      fetchAllWooCommerceOrders(wooClient, startBoundary, endBoundary),
      fetchAllWooCommerceOrders(wooClient, trailingStartBoundary, endBoundary),
      fetchAllWooCommerceProducts(wooClient),
      fetchOptimizationLogs(storeId),
      fetchOptimizationHistory(storeId),
      fetchProductMetaRecords(storeId),
      fetchLatestPageAudits(storeId),
    ]);

    const googleMap = {};
    for (const row of googleResults) {
      // Google Ads REST JSON uses lowerCamelCase (productItemId, costMicros),
      // while GAQL queries use snake_case. Accept both.
      const sku = normalizeSku(
        row.segments?.product_item_id || row.segments?.productItemId || ''
      );

      if (!sku) {
        continue;
      }

      if (!googleMap[sku]) {
        googleMap[sku] = { clicks: 0, cost: 0 };
      }

      googleMap[sku].clicks += parseInt(row.metrics?.clicks || 0, 10);
      googleMap[sku].cost +=
        parseFloat(row.metrics?.cost_micros || row.metrics?.costMicros || 0) / 1000000;
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

    const latestHistoryMap = {};
    for (const history of optimizationHistory) {
      const sku = normalizeSku(history.sku);

      if (!sku || latestHistoryMap[sku]) {
        continue;
      }

      latestHistoryMap[sku] = history;
    }

    // Latest "Mark Optimized" entry per SKU. The log is the source of truth for
    // the timestamp (it is always written); the note comes from the matching
    // history snapshot when one was captured in the same request.
    const latestOptimizedMap = {};
    for (const log of optimizationLogs) {
      const sku = normalizeSku(log.sku);

      if (!sku || latestOptimizedMap[sku]) {
        continue;
      }

      const history = latestHistoryMap[sku];
      let note = log.actionTaken || 'Marked as optimized';

      if (history?.optimizationNotes && history.snapshotDate && log.appliedAt) {
        const noteLagMs =
          new Date(history.snapshotDate).getTime() - new Date(log.appliedAt).getTime();

        if (noteLagMs >= 0 && noteLagMs < 60000) {
          note = history.optimizationNotes;
        }
      }

      latestOptimizedMap[sku] = {
        optimizedAt: log.appliedAt,
        note,
      };
    }

    let sinceOptimizedGoogleMap = {};
    let sinceOptimizedWooMap = {};

    // Zero overhead when nothing has been optimized: the extra Google Ads and
    // WooCommerce requests only run for stores with at least one entry.
    if (Object.keys(latestOptimizedMap).length > 0) {
      const earliestOptimizedTime = Object.values(latestOptimizedMap).reduce(
        (earliest, item) => {
          const time = new Date(item.optimizedAt).getTime();
          return time < earliest ? time : earliest;
        },
        Infinity
      );

      const [sinceGoogleMap, sinceOptimizedOrdersResponse] = await Promise.all([
        fetchSinceOptimizedGoogleMetrics(customer, latestOptimizedMap),
        fetchAllWooCommerceOrders(wooClient, new Date(earliestOptimizedTime), new Date()),
      ]);

      sinceOptimizedGoogleMap = sinceGoogleMap;
      sinceOptimizedWooMap = buildSinceOptimizedSalesMap(
        sinceOptimizedOrdersResponse.data,
        latestOptimizedMap
      );
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
      const latestOptimized = latestOptimizedMap[sku] || null;
      const metrics = computeMetrics(
        googleMetrics,
        salesMetrics,
        trailingSales,
        inventory,
        productMeta
      );
      const learningPhase = Boolean(
        optimizationLog &&
          new Date(optimizationLog.appliedAt).getTime() >= learningPeriodStart.getTime()
      );

      const sinceOptimized = latestOptimized
        ? {
            optimizedAt: latestOptimized.optimizedAt,
            note: latestOptimized.note,
            impressions: sinceOptimizedGoogleMap[sku]?.impressions || 0,
            ...computeMetrics(
              sinceOptimizedGoogleMap[sku] || { clicks: 0, impressions: 0, cost: 0 },
              sinceOptimizedWooMap[sku] || { rev: 0, count: 0 },
              trailingSales,
              inventory,
              productMeta
            ),
          }
        : null;

      return {
        actionTaken: optimizationLog?.actionTaken || null,
        ...metrics,
        auditMissingElements: latestAudit?.missingElements || [],
        auditScore: latestAudit?.score ?? null,
        costPrice: Number(productMeta.costPrice || 0).toFixed(2),
        isHidden: productMeta.isHidden || false,
        latestAuditAt: latestAudit?.createdAt || null,
        leadTime: productMeta.leadTime || 0,
        learningPhase,
        minSalesTarget: productMeta.minSalesTarget || 0,
        optimizedAt: optimizationLog?.appliedAt || null,
        price: inventory.price.toFixed(2),
        productName: inventory.productName,
        productUrl: inventory.productUrl,
        salesLast30: trailingSales.count,
        sinceOptimized,
        sku: sku.toUpperCase(),
        stock_quantity: inventory.stock_quantity,
        stock_status: inventory.stock_status,
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

    // Neon's driver wraps connection failures as
    // "Error connecting to database: TypeError: fetch failed".
    if (error?.sourceError || /Error connecting to database/i.test(error?.message || '')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not connect to the database. Please try again.',
          errorCode: 'db_connection_failed',
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errorCode: error.code || null,
        detail: error.detail || null,
      },
      { status: 500 }
    );
  }
}
