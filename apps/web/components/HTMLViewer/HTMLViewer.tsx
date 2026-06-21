import sanitizeHtml from 'sanitize-html';
import { linkifyBareUrls } from './linkify';

interface HTMLViewerProps {
  html: string;
}

// Sanitises untrusted job-description / how-to-apply HTML before it goes into
// dangerouslySetInnerHTML. We use `sanitize-html` (pure Node, no DOM) rather
// than DOMPurify/jsdom: jsdom@28 pulls an ESM-only transitive dep
// (html-encoding-sniffer → @exodus/bytes) that throws ERR_REQUIRE_ESM in the
// Vercel serverless runtime, 500ing every /job/[id] page. sanitize-html has no
// such dependency and runs identically on server and client.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'span',
    'div',
    'code',
    'pre',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    '*': ['style'],
  },
  // Force external links to be safe — no referrer leakage, no tab-nabbing.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    }),
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

const HTMLViewer = ({ html }: HTMLViewerProps) => {
  // sanitize → linkify bare text URLs → sanitize again. The second pass runs the
  // injected <a> tags back through transformTags, so auto-linked URLs get the
  // same rel="noopener noreferrer nofollow" + target=_blank and scheme allowlist
  // as authored links.
  const safeHtml = sanitizeHtml(
    linkifyBareUrls(sanitizeHtml(html, SANITIZE_OPTIONS)),
    SANITIZE_OPTIONS,
  );

  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default HTMLViewer;
