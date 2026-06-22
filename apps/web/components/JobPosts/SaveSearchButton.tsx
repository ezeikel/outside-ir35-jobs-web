'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { saveSearch } from '@/app/actions';
import { Button } from '@/components/ui/button';
import type { SearchParams } from '@/lib/search/filters';

/**
 * "Save this search" — lets a signed-in contractor save the current /jobs filter
 * and get emailed new matches. Rendered only when `canSave` (signed-in JOB_SEEKER);
 * otherwise a sign-in prompt. The current params are passed from the server
 * component so the saved search exactly mirrors what's on screen.
 */
const SaveSearchButton = ({
  params,
  canSave,
}: {
  params: SearchParams;
  canSave: boolean;
}) => {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSave) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        <Link href="/api/auth/signin" className="text-link hover:underline">
          Sign in
        </Link>{' '}
        to save this search and get emailed new matches.
      </p>
    );
  }

  if (saved) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Saved — we’ll email you new matches.{' '}
        <Link href="/alerts" className="text-link hover:underline">
          Manage alerts
        </Link>
      </p>
    );
  }

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveSearch(params);
        setSaved(true);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not save this search.',
        );
      }
    });
  };

  return (
    <div className="mt-3 flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={onSave} disabled={pending}>
        {pending ? 'Saving…' : 'Save this search & get alerts'}
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
};

export default SaveSearchButton;
