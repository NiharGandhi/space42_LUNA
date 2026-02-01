import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { uploadResumeToR2 } from '@/lib/storage/r2';
import { extractResumeText } from '@/lib/resume/extract-text';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF and DOCX files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const { fileKey, url } = await uploadResumeToR2(
      buffer,
      file.name,
      file.type,
      user.id
    );

    // Extract text so the agent can use it (summarize, include in application)
    const resumeText = await extractResumeText(buffer, file.type);
    const resumeTextExtracted = Boolean(resumeText?.trim());

    return NextResponse.json(
      {
        success: true,
        fileKey,
        url,
        resumeTextExtracted,
        ...(resumeText && { resumeText }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
