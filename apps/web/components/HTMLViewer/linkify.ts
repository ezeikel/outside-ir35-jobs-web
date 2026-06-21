/**
 * Auto-linkify bare URLs that appear as TEXT in an HTML string.
 *
 * Why: job how-to-apply / description HTML comes from a TipTap editor (or a
 * scraper) and frequently contains a bare URL typed as plain text — e.g.
 * `<p>https://www.jobserve.com/...</p>`. sanitize-html keeps existing <a> tags
 * but cannot create them, so a bare URL renders as unclickable text. This wraps
 * those text URLs in <a href> so HTMLViewer's sanitize pass can then enforce
 * rel="noopener noreferrer nofollow" + target=_blank on them.
 *
 * Pure + tested. It only touches TEXT segments (between tags), so URLs already
 * inside an attribute (e.g. an existing `<a href="...">`) are never double-wrapped.
 */

// http(s) URL not immediately preceded by a quote or `=` (which would mean it's
// already in an attribute). We split on tags first, so this only ever runs on
// text, but the lookbehind is a cheap extra guard.
const BARE_URL_RE = /(?<!["'=])(https?:\/\/[^\s<>"']+)/g;

// Trailing punctuation that's almost certainly sentence punctuation, not part of
// the URL (e.g. "see https://x.com/path." → link should not include the dot).
const TRAILING_PUNCT = /[.,;:!?)\]}]+$/;

const wrapUrl = (raw: string): string => {
  const trail = TRAILING_PUNCT.exec(raw)?.[0] ?? '';
  const url = trail ? raw.slice(0, raw.length - trail.length) : raw;
  return `<a href="${url}">${url}</a>${trail}`;
};

export const linkifyBareUrls = (html: string): string => {
  // Split into tag vs text segments; the captured group keeps the delimiters.
  const segments = html.split(/(<[^>]+>)/g);
  // Track anchor depth so we never wrap a URL that's the visible text of an
  // existing <a>…</a> (which would nest <a> in <a>).
  let anchorDepth = 0;

  return segments
    .map((seg) => {
      if (seg.startsWith('<')) {
        if (/^<a[\s>]/i.test(seg)) anchorDepth += 1;
        else if (/^<\/a\s*>/i.test(seg))
          anchorDepth = Math.max(0, anchorDepth - 1);
        return seg;
      }
      if (anchorDepth > 0) return seg; // text inside an anchor — leave it
      return seg.replace(BARE_URL_RE, (m) => wrapUrl(m));
    })
    .join('');
};
