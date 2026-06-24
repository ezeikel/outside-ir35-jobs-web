import { describe, expect, it } from 'vitest';
import { markdownToPortableText } from './portable-text.js';

describe('markdownToPortableText', () => {
  it('maps headings to h2/h3/h4 and demotes # to h2', () => {
    const blocks = markdownToPortableText(
      '# Title\n## Sub\n### Sub-sub\n#### Deep',
    );
    expect(blocks.map((b) => b.style)).toEqual(['h2', 'h2', 'h3', 'h4']);
  });

  it('maps a plain paragraph to a normal block', () => {
    const [b] = markdownToPortableText('Just a paragraph.');
    expect(b.style).toBe('normal');
    expect(b.children?.[0].text).toBe('Just a paragraph.');
  });

  it('parses bold and italic inline marks', () => {
    const [b] = markdownToPortableText('This is **bold** and *italic*.');
    const marks = (b.children ?? []).flatMap((c) => c.marks ?? []);
    expect(marks).toContain('strong');
    expect(marks).toContain('em');
  });

  it('parses links into markDefs + a span mark', () => {
    const [b] = markdownToPortableText('See [HMRC](https://gov.uk/ir35).');
    expect(b.markDefs?.[0]).toMatchObject({
      _type: 'link',
      href: 'https://gov.uk/ir35',
    });
    const linkSpan = (b.children ?? []).find((c) => c.text === 'HMRC');
    expect(linkSpan?.marks?.[0]).toBe(b.markDefs?.[0]._key);
  });

  it('maps bullet and numbered lists', () => {
    const blocks = markdownToPortableText('- one\n- two\n1. first\n2. second');
    expect(blocks.map((b) => b.listItem)).toEqual([
      'bullet',
      'bullet',
      'number',
      'number',
    ]);
    expect(blocks.every((b) => b.level === 1)).toBe(true);
  });

  it('maps blockquotes and skips blank lines + horizontal rules', () => {
    const blocks = markdownToPortableText('> quoted\n\n---\n\nafter');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].style).toBe('blockquote');
    expect(blocks[1].children?.[0].text).toBe('after');
  });

  it('gives every block and span a unique _key', () => {
    const blocks = markdownToPortableText('## A\n\nbody **x** y');
    const keys = blocks.map((b) => b._key);
    expect(new Set(keys).size).toBe(keys.length);
    const spanKeys = blocks.flatMap((b) =>
      (b.children ?? []).map((c) => c._key),
    );
    expect(new Set(spanKeys).size).toBe(spanKeys.length);
  });
});
