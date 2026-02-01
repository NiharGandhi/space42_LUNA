import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyDocuments } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { uploadCompanyDocToR2 } from '@/lib/storage/r2';
import { desc } from 'drizzle-orm';
import { extractResumeText } from '@/lib/resume/extract-text';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** GET /api/hr/company-documents — List all company documents (HR only) */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can list company documents' }, { status: 403 });
    }

    const rows = await db.select().from(companyDocuments).orderBy(desc(companyDocuments.createdAt));
    return NextResponse.json({
      success: true,
      documents: rows.map((r) => ({
        id: r.id,
        name: r.name,
        fileKey: r.fileKey,
        contentType: r.contentType,
        hasExtractedText: Boolean(r.extractedText?.trim()),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Company documents GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

/** POST /api/hr/company-documents — Upload a document (HR only). FormData: file */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can upload company documents' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF and DOCX files are allowed' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileKey } = await uploadCompanyDocToR2(buffer, file.name, file.type);
    const extractedText = await extractResumeText(buffer, file.type);

    const now = new Date();
    const [row] = await db
      .insert(companyDocuments)
      .values({
        name: file.name,
        fileKey,
        contentType: file.type,
        extractedText: extractedText ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      return NextResponse.json({ success: false, error: 'Failed to save document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: row.id,
        name: row.name,
        fileKey: row.fileKey,
        hasExtractedText: Boolean(row.extractedText?.trim()),
        createdAt: row.createdAt,
      },
    });
  } catch (error) {
    console.error('Company documents POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
