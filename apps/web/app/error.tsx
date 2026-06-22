'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary (within the root layout, so the header/footer stay).
 * Catches an uncaught error in any page — e.g. a billing/AI surface throwing on a
 * missing env var — and shows a friendly recover/retry instead of a raw crash.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-4xl leading-none">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        That page hit a snag. Please try again — if it keeps happening, head
        back to the board.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/jobs">Browse contracts</Link>
        </Button>
      </div>
    </div>
  );
}
