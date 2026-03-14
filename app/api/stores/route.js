import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route.js';
import { prisma } from '../../../lib/prisma.js';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    console.error("Stores API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, googleClientId, googleClientSecret, googleDeveloperToken, googleRefreshToken, googleCustomerId, googleLoginCustomerId, wooUrl, wooCk, wooCs } = body;

    if (!name || !googleClientId || !googleClientSecret || !googleDeveloperToken || !googleRefreshToken || !googleCustomerId || !googleLoginCustomerId || !wooUrl || !wooCk || !wooCs) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: {
        userId: session.user.id,
        name,
        googleClientId,
        googleClientSecret,
        googleDeveloperToken,
        googleRefreshToken,
        googleCustomerId,
        googleLoginCustomerId,
        wooUrl,
        wooCk,
        wooCs,
      }
    });

    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("Create Store API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}