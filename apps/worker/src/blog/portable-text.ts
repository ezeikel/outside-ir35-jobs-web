/**
 * Markdown → Sanity Portable Text converter for blog posts. Ported from the
 * chunky-crayon worker's mapper, simplified to our `post.body` schema (styles
 * h2/h3/h4/normal/blockquote; lists bullet/number; marks strong/em/link). A
 * top-level `# ` is demoted to h2 since the post title is the page H1.
 *
 * Pure + unit-tested — a silent formatting bug would corrupt every published
 * post, so it gets a test (our testing rule).
 */

type PortableTextSpan = {
  _type: 'span';
  _key: string;
  text: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _type: string;
  _key: string;
  href?: string;
};

export type PortableTextBlock = {
  _type: 'block';
  _key: string;
  style?: string;
  children?: PortableTextSpan[];
  listItem?: string;
  level?: number;
  markDefs?: PortableTextMarkDef[];
};

const parseInlineFormatting = (
  text: string,
  keyPrefix: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } => {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let spanIndex = 0;

  const inlinePattern =
    /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null = inlinePattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        children.push({
          _type: 'span',
          _key: `${keyPrefix}_span_${spanIndex++}`,
          text: beforeText,
        });
      }
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) {
      const boldText = match[2] || match[3];
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: boldText,
        marks: ['strong'],
      });
    } else if (fullMatch.startsWith('[')) {
      const linkText = match[6];
      const linkHref = match[7];
      const linkKey = `link_${keyPrefix}_${spanIndex}`;
      markDefs.push({ _type: 'link', _key: linkKey, href: linkHref });
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: linkText,
        marks: [linkKey],
      });
    } else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) {
      const italicText = match[4] || match[5];
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: italicText,
        marks: ['em'],
      });
    }

    lastIndex = match.index + fullMatch.length;
    match = inlinePattern.exec(text);
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: remainingText,
      });
    }
  }

  if (children.length === 0) {
    children.push({ _type: 'span', _key: `${keyPrefix}_span_0`, text });
  }

  return { children, markDefs };
};

const block = (
  key: string,
  style: string,
  text: string,
  extra?: { listItem?: string; level?: number },
): PortableTextBlock => {
  const { children, markDefs } = parseInlineFormatting(text, key);
  return {
    _type: 'block',
    _key: key,
    style,
    children,
    markDefs,
    ...(extra ?? {}),
  };
};

export const markdownToPortableText = (
  markdown: string,
): PortableTextBlock[] => {
  const lines = markdown.split('\n');
  const blocks: PortableTextBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `block_${i}`;

    if (!line.trim()) continue;
    // Horizontal rule — skip (no schema style for it).
    if (/^[-*_]{3,}\s*$/.test(line.trim())) continue;

    // `# ` is demoted to h2 (post title is the page H1).
    if (line.startsWith('# ')) {
      blocks.push(block(key, 'h2', line.slice(2)));
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(block(key, 'h2', line.slice(3)));
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(block(key, 'h3', line.slice(4)));
      continue;
    }
    if (line.startsWith('#### ')) {
      blocks.push(block(key, 'h4', line.slice(5)));
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push(
        block(key, 'normal', line.slice(2), { listItem: 'bullet', level: 1 }),
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      blocks.push(block(key, 'normal', text, { listItem: 'number', level: 1 }));
      continue;
    }
    if (line.startsWith('> ')) {
      blocks.push(block(key, 'blockquote', line.slice(2)));
      continue;
    }

    blocks.push(block(key, 'normal', line));
  }

  return blocks;
};
