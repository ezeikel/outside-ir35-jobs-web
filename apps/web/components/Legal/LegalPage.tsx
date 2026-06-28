import type { ReactNode } from 'react';

/**
 * Shared layout + typography for legal pages (/privacy, /terms). Plain prose in
 * the site's design tokens — no client JS.
 */
const LegalPage = ({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) => (
  <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
    <header className="mb-8">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        outsideir35jobs.com
      </p>
      <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated {updated}
      </p>
    </header>
    <div className="legal-prose space-y-4 text-[15px] leading-relaxed text-foreground/90">
      {children}
    </div>
  </div>
);

// Heading + paragraph helpers so the page bodies stay readable.
export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-8 mb-2 font-display text-2xl leading-tight">{children}</h2>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p className="my-3">{children}</p>
);

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
);

export default LegalPage;
