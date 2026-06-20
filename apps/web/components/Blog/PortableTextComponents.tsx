import type { PortableTextComponents } from '@portabletext/react';
import Link from 'next/link';

// Renders the Sanity portable-text body in this app's design system. Mirrors the
// styles the worker's markdown→portable-text mapper emits (h2/h3/h4, blockquote,
// strong/em, link, bullet/number lists).
export const portableTextComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 font-display text-3xl leading-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-2 font-display text-2xl leading-tight">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 font-display text-xl leading-tight">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-border pl-4 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="my-4 leading-relaxed text-foreground/90">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 list-disc space-y-1 pl-6 text-foreground/90">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 list-decimal space-y-1 pl-6 text-foreground/90">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => {
      const href = (value?.href as string) ?? '#';
      const external = /^https?:\/\//.test(href);
      return external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-verified underline underline-offset-2 hover:opacity-80"
        >
          {children}
        </a>
      ) : (
        <Link
          href={href}
          className="text-verified underline underline-offset-2 hover:opacity-80"
        >
          {children}
        </Link>
      );
    },
  },
};
