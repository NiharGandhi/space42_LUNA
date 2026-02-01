import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyContext, companyDocuments } from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { fetchUrlsAsText } from '@/lib/url/fetch-url-text';
import { generateOnboardingFlow } from '@/lib/ai/agents/onboarding-flow-generator';

/**
 * POST /api/hr/onboarding-templates/generate
 * HR only. Body: { prompt: string, useCompanyContext?: boolean, existingTasks?: Array<{...}> }
 * Returns AI-generated list of tasks. Optionally uses company context, docs, and URLs.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'hr' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR can generate flows' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    const useCompanyContext = body.useCompanyContext !== false;
    const existingTasks = Array.isArray(body.existingTasks) ? body.existingTasks : undefined;

    let companyContextMap: Record<string, string> = {};
    let documentsText = '';
    let urlsText = '';

    if (useCompanyContext) {
      const [contextRows, docRows] = await Promise.all([
        db.select().from(companyContext),
        db.select({ name: companyDocuments.name, extractedText: companyDocuments.extractedText }).from(companyDocuments),
      ]);
      for (const r of contextRows) {
        companyContextMap[r.key] = r.value ?? '';
      }
      for (const d of docRows) {
        if (d.extractedText?.trim()) {
          documentsText += `--- ${d.name} ---\n${d.extractedText}\n\n`;
        }
      }
      const urlsRaw = companyContextMap.company_urls?.trim() || '';
      const urlList = urlsRaw.split(/\n/).map((u) => u.trim()).filter(Boolean);
      if (urlList.length > 0) {
        const { text } = await fetchUrlsAsText(urlList);
        urlsText = text;
      }
    }

    const tasks = await generateOnboardingFlow({
      prompt,
      companyContext: Object.keys(companyContextMap).length > 0 ? companyContextMap : undefined,
      documentsText: documentsText || undefined,
      urlsText: urlsText || undefined,
      existingTasks,
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Onboarding generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate flow' },
      { status: 500 }
    );
  }
}
