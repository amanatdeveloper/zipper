import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { getAuthenticatedUser, getAccessibleStore } from '../../../lib/auth-helpers.js';

export async function GET(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ success: false, error: 'storeId is required' }, { status: 400 });
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found or access denied' }, { status: 404 });
    }

    if (!prisma.optimizationLog?.findMany) {
      return NextResponse.json({ success: true, data: [] });
    }

    const logs = await prisma.optimizationLog.findMany({
      where: { storeId },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Optimization Logs API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : '';
    const storeId = typeof body?.storeId === 'string' ? body.storeId.trim() : '';
    const actionTaken = typeof body?.actionTaken === 'string' && body.actionTaken.trim()
      ? body.actionTaken.trim()
      : 'Marked as optimized';

    if (!sku || !storeId) {
      return NextResponse.json(
        { success: false, error: 'sku and storeId are required' },
        { status: 400 }
      );
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found or access denied' }, { status: 404 });
    }

    const optimizationLog = await prisma.optimizationLog.create({
      data: {
        sku,
        storeId,
        actionTaken,
      },
    });

    return NextResponse.json({ success: true, data: optimizationLog });
  } catch (error) {
    console.error('Optimize API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const storeId = typeof body?.storeId === 'string' ? body.storeId.trim() : '';

    if (!id || !storeId) {
      return NextResponse.json({ success: false, error: 'id and storeId are required' }, { status: 400 });
    }

    const store = await getAccessibleStore(user, storeId);

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found or access denied' }, { status: 404 });
    }

    const deletedLog = await prisma.optimizationLog.deleteMany({
      where: {
        id,
        storeId,
      },
    });

    if (deletedLog.count === 0) {
      return NextResponse.json({ success: false, error: 'Optimization log not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Optimization Log API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
