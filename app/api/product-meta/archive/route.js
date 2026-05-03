import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { getAccessibleStore, getAuthenticatedUser } from '../../../../lib/auth-helpers.js';
import { normalizeSku } from '../../../../lib/product-meta.js';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const storeId = typeof body?.storeId === 'string' ? body.storeId.trim() : '';
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : '';
    const isHidden = typeof body?.isHidden === 'boolean' ? body.isHidden : true;

    if (!storeId || !sku) {
      return NextResponse.json(
        { success: false, error: 'storeId and sku are required' },
        { status: 400 }
      );
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found or access denied' },
        { status: 404 }
      );
    }

    const normalizedSku = normalizeSku(sku);

    if (!normalizedSku) {
      return NextResponse.json(
        { success: false, error: 'Invalid SKU format' },
        { status: 400 }
      );
    }

    let productMeta = await prisma.productMeta.findFirst({
      where: {
        storeId,
        normalizedSku,
      },
    });

    if (!productMeta) {
      // Create a new record if it doesn't exist
      productMeta = await prisma.productMeta.create({
        data: {
          sku,
          normalizedSku,
          storeId,
          isHidden,
        },
      });
    } else {
      // Update existing record
      productMeta = await prisma.productMeta.update({
        where: { id: productMeta.id },
        data: { isHidden },
      });
    }

    return NextResponse.json({
      success: true,
      data: productMeta,
    });
  } catch (error) {
    console.error('Archive API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
