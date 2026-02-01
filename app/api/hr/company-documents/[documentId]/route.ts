import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyDocuments } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

/** DELETE /api/hr/company-documents/[documentId] — Delete a company document (HR only) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can delete company documents' }, { status: 403 });
    }

    const { documentId } = await params;
    const [doc] = await db.select().from(companyDocuments).where(eq(companyDocuments.id, documentId)).limit(1);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    await db.delete(companyDocuments).where(eq(companyDocuments.id, documentId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Company document DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
