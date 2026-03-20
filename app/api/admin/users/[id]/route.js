import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma.js';
import { getAuthenticatedUser, isSuperAdmin } from '../../../../../lib/auth-helpers.js';

export async function GET(request, { params }) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const foundUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        stores: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!foundUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: foundUser });
  } catch (error) {
    console.error('Admin User API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!isSuperAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'STORE_USER';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email is already in use' }, { status: 409 });
    }

    const data = {
      email,
      role,
    };

    if (password.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        stores: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update User API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
