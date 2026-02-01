/**
 * Fetch a URL and return plain text (strip HTML) for onboarding AI context.
 * Limits size and time to avoid token explosion and slow requests.
 */

const MAX_CHARS_PER_URL = 15000;
const REQUEST_TIMEOUT_MS = 8000;

function stripHtml(html: string): string {
  const noScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  const noStyle = noScript.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  const text = noStyle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

export async function fetchUrlAsText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Space42-OnboardingBot/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    const html = await res.text();
    const text = stripHtml(html);
    return text.length > MAX_CHARS_PER_URL ? text.slice(0, MAX_CHARS_PER_URL) + '…' : text;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple URLs and return combined text, with a total character limit.
 */
export async function fetchUrlsAsText(
  urls: string[],
  maxTotalChars: number = 40000
): Promise<{ text: string; fetched: string[] }> {
  const validUrls = urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://'));
  const results: string[] = [];
  const fetched: string[] = [];
  let total = 0;

  for (const url of validUrls) {
    if (total >= maxTotalChars) break;
    const text = await fetchUrlAsText(url);
    if (text && text.length > 0) {
      const remaining = maxTotalChars - total;
      const chunk = text.length > remaining ? text.slice(0, remaining) + '…' : text;
      results.push(`--- Content from ${url} ---\n${chunk}`);
      fetched.push(url);
      total += chunk.length;
    }
  }

  return { text: results.join('\n\n'), fetched };
}
