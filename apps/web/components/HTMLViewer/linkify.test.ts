import sanitizeHtml from 'sanitize-html';
import { describe, expect, it } from 'vitest';
import { linkifyBareUrls } from './linkify';

describe('linkifyBareUrls', () => {
  it('wraps a bare URL in an anchor', () => {
    expect(linkifyBareUrls('<p>https://example.com/apply</p>')).toBe(
      '<p><a href="https://example.com/apply">https://example.com/apply</a></p>',
    );
  });

  it('does not double-wrap a URL already inside an anchor', () => {
    const input =
      '<p><a href="https://example.com">https://example.com</a></p>';
    // The link text is a bare URL; wrapping it again would nest <a> in <a>.
    const out = linkifyBareUrls(input);
    expect(out).toBe(input); // unchanged — no nesting
    expect(out.match(/<a /g)?.length).toBe(1);
  });

  it('linkifies only the URL in mixed text', () => {
    const out = linkifyBareUrls(
      '<p>Email us or visit https://example.com/apply today</p>',
    );
    expect(out).toContain('visit <a href="https://example.com/apply">');
    expect(out).toContain('</a> today');
  });

  it('keeps trailing sentence punctuation outside the link', () => {
    const out = linkifyBareUrls('<p>See https://example.com/x.</p>');
    expect(out).toBe(
      '<p>See <a href="https://example.com/x">https://example.com/x</a>.</p>',
    );
  });

  it('ignores non-http schemes (no javascript: links)', () => {
    // Not an http(s) URL → not linkified by us.
    expect(linkifyBareUrls('<p>javascript:alert(1)</p>')).toBe(
      '<p>javascript:alert(1)</p>',
    );
  });
});

// Mirror HTMLViewer's sanitize → linkify → sanitize sandwich to prove the
// auto-linked anchor inherits the safe rel/target and that dangerous schemes
// never survive.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'a', 'span', 'div'],
  allowedAttributes: { a: ['href', 'name', 'target', 'rel'], '*': ['style'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    }),
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

const render = (html: string) =>
  sanitizeHtml(
    linkifyBareUrls(sanitizeHtml(html, SANITIZE_OPTIONS)),
    SANITIZE_OPTIONS,
  );

describe('HTMLViewer sanitize→linkify→sanitize pipeline', () => {
  it('auto-linked URLs get rel + target', () => {
    const out = render('<p>Apply at https://www.jobserve.com/x</p>');
    expect(out).toContain('href="https://www.jobserve.com/x"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('target="_blank"');
  });

  it('strips a javascript: anchor entirely (scheme allowlist)', () => {
    const out = render('<p><a href="javascript:alert(1)">x</a></p>');
    expect(out).not.toContain('javascript:');
  });
});
