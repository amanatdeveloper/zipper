import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route.js';
import { prisma } from '../../../../lib/prisma.js';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const store = await prisma.store.findFirst({
      where: {
        id: id,
        userId: session.user.id, // Ensure user can only access their own stores
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      }
    });

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("Store API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}