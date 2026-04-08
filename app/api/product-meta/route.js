import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { getAccessibleStore, getAuthenticatedUser } from '../../../lib/auth-helpers.js';
import {
  isMissingProductMetaStorage,
  normalizeSku,
  sanitizeFloatValue,
  sanitizeIntValue,
} from '../../../lib/product-meta.js';

export const dynamic = 'force-dynamic';

function serializeProductMeta(productMeta) {
  return {
    sku: productMeta.sku,
    costPrice: productMeta.costPrice,
    leadTime: productMeta.leadTime,
    minSalesTarget: productMeta.minSalesTarget,
    updatedAt: productMeta.updatedAt,
  };
}

export async function PUT(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const storeId = typeof body?.storeId === 'string' ? body.storeId.trim() : '';
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : '';
    const normalizedSku = normalizeSku(sku);

    if (!storeId || !normalizedSku) {
      return NextResponse.json(
        { success: false, error: 'storeId and sku are required' },
        { status: 400 }
      );
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found or access denied' }, { status: 404 });
    }

    const productMeta = await prisma.productMeta.upsert({
      where: {
        storeId_normalizedSku: {
          storeId,
          normalizedSku,
        },
      },
      update: {
        sku,
        costPrice: sanitizeFloatValue(body?.costPrice),
        leadTime: sanitizeIntValue(body?.leadTime),
        minSalesTarget: sanitizeIntValue(body?.minSalesTarget),
      },
      create: {
        sku,
        normalizedSku,
        storeId,
        costPrice: sanitizeFloatValue(body?.costPrice),
        leadTime: sanitizeIntValue(body?.leadTime),
        minSalesTarget: sanitizeIntValue(body?.minSalesTarget),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeProductMeta(productMeta),
    });
  } catch (error) {
    console.error('Product Meta API Error:', error);

    if (isMissingProductMetaStorage(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ProductMeta storage is not available yet. Apply the Prisma schema update before saving dashboard fields.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
