// Best-effort Open Graph preview fetcher for linked places (hotels,
// Airbnbs, restaurants). Regex-based meta-tag extraction rather than a
// full HTML parser — enough for the static <head> tags every OG-aware
// site emits, and avoids pulling in a DOM/parser dependency for a
// best-effort feature. Sites that block simple fetches or only render
// metadata client-side (common for some booking sites) just won't get a
// preview; the raw link still works either way. Only ever called
// server-side.
export interface LinkPreview {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

function extractMeta(html: string, property: string): string | null {
  // Matches <meta property="og:title" content="..."> in either attribute
  // order, single or double quotes.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Basic SSRF guard: only fetch public http(s) URLs, never internal/
// loopback/link-local addresses or non-http(s) schemes. Not exhaustive
// (doesn't resolve DNS to catch a hostname that *resolves* to a private
// IP), but blocks the obvious cases of someone pasting an internal URL.
function isSafeToFetch(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname === '0.0.0.0' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '::1'
  ) {
    return false;
  }

  return true;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  if (!isSafeToFetch(url)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DeleViajeBot/1.0; +https://github.com/deleviaje/trip-planner)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;

    // Only read the first chunk — OG tags live in <head>, no need to
    // download the whole page.
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = '';
    const decoder = new TextDecoder();
    while (html.length < 100_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }
    reader.cancel().catch(() => {});

    const title = extractMeta(html, 'og:title') ?? html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null;
    const description = extractMeta(html, 'og:description');
    const imageUrl = extractMeta(html, 'og:image');

    if (!title && !description && !imageUrl) return null;

    return {
      title: title?.trim() ?? null,
      description: description?.trim() ?? null,
      imageUrl: imageUrl?.trim() ?? null,
    };
  } catch (error) {
    console.error('Link preview fetch failed:', error);
    return null;
  }
}
