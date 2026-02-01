import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyContext } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

// GET /api/hr/company-context - List all company context (HR only)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can view company context' },
        { status: 403 }
      );
    }

    const rows = await db.select().from(companyContext);
    const context: Record<string, string> = {};
    for (const r of rows) {
      context[r.key] = r.value ?? '';
    }
    return NextResponse.json({ success: true, context });
  } catch (error) {
    console.error('Company context GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company context' },
      { status: 500 }
    );
  }
}

// PATCH /api/hr/company-context - Update company context (HR only). Body: { key: string, value: string } or { updates: Record<string, string> }
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only HR can update company context' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates = body.updates ?? (body.key != null ? { [body.key]: body.value } : {});

    const now = new Date();
    for (const [key, value] of Object.entries(updates)) {
      if (typeof key !== 'string' || key.length > 100) continue;
      const val = value === null || value === undefined ? '' : String(value);
      const [existing] = await db
        .select({ id: companyContext.id })
        .from(companyContext)
        .where(eq(companyContext.key, key))
        .limit(1);
      if (existing) {
        await db
          .update(companyContext)
          .set({ value: val, updatedAt: now })
          .where(eq(companyContext.key, key));
      } else {
        await db.insert(companyContext).values({ key, value: val, updatedAt: now });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Company context PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company context' },
      { status: 500 }
    );
  }
}
