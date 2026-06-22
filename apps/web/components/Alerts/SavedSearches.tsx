'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { SavedSearchRow } from '@/app/actions';
import { deleteSavedSearch, setSavedSearchAlerts } from '@/app/actions';
import { Button } from '@/components/ui/button';

// Human label for a saved search — mirrors the server's searchLabel().
const labelOf = (s: SavedSearchRow): string => {
  const parts: string[] = [];
  if (s.query) parts.push(s.query);
  if (s.location) parts.push(s.location);
  if (s.mode) parts.push(s.mode.toLowerCase().replace('_', '-'));
  if (s.minRate) parts.push(`£${s.minRate}+/day`);
  if (s.ir35 === 'outside') parts.push('outside only');
  return parts.length ? parts.join(' · ') : 'All outside-IR35 contracts';
};

// Rebuild the /jobs URL for a saved search so "View" reruns it on the board.
const hrefOf = (s: SavedSearchRow): string => {
  const p = new URLSearchParams();
  if (s.query) p.set('q', s.query);
  if (s.location) p.set('location', s.location);
  if (s.ir35) p.set('ir35', s.ir35);
  if (s.mode) p.set('mode', s.mode);
  if (s.minRate) p.set('minRate', String(s.minRate));
  const qs = p.toString();
  return qs ? `/jobs?${qs}` : '/jobs';
};

const SavedSearchItem = ({ search }: { search: SavedSearchRow }) => {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [enabled, setEnabled] = useState(search.alertsEnabled);

  if (removed) return null;

  const toggle = () =>
    startTransition(async () => {
      const next = !enabled;
      setEnabled(next);
      await setSavedSearchAlerts(search.id, next);
    });

  const remove = () =>
    startTransition(async () => {
      setRemoved(true);
      await deleteSavedSearch(search.id);
    });

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <Link
          href={hrefOf(search)}
          className="font-display text-lg hover:text-foreground"
        >
          {labelOf(search)}
        </Link>
        <p className="text-xs text-muted-foreground">
          {enabled ? 'Email alerts on' : 'Alerts paused'}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
          {enabled ? 'Pause' : 'Resume'}
        </Button>
        <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </li>
  );
};

const SavedSearches = ({ searches }: { searches: SavedSearchRow[] }) => {
  if (searches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="font-display text-2xl">No saved searches yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Filter the board to what you want, then “Save this search” to get
          emailed new matching outside-IR35 contracts.
        </p>
        <Button asChild className="mt-6">
          <Link href="/jobs">Browse contracts</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {searches.map((s) => (
        <SavedSearchItem key={s.id} search={s} />
      ))}
    </ul>
  );
};

export default SavedSearches;
