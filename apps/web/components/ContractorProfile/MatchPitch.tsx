'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { getJobMatchAndPitch, type MatchPitchResult } from '@/app/actions';
import { Button } from '@/components/ui/button';

/**
 * Premium "why-matched + draft a pitch" for a recommended job. Lazily calls the AI
 * on demand (one Claude call per job), so it never runs for jobs the contractor
 * doesn't open. Honest: the pitch is constrained to the contractor's real CV facts
 * server-side. Free contractors see an upgrade prompt instead.
 */
const MatchPitch = ({ jobId }: { jobId: string }) => {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MatchPitchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () =>
    startTransition(async () => {
      setResult(await getJobMatchAndPitch(jobId));
    });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  };

  if (!result) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={run}
        disabled={pending}
      >
        {pending ? 'Thinking…' : '✦ Why matched & draft a pitch'}
      </Button>
    );
  }

  if (result.status === 'not_premium') {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        <Link href="/premium" className="text-link hover:underline">
          Upgrade to premium
        </Link>{' '}
        for an AI explanation of why this matched and a tailored pitch.
      </p>
    );
  }

  if (result.status === 'no_cv') {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a CV on your profile so we can explain the match and draft a
        pitch.
      </p>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-3">
        <p className="text-sm text-destructive">Couldn’t generate right now.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setResult(null);
            run();
          }}
          disabled={pending}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Why this matched you
      </p>
      <ul className="mt-1 space-y-1">
        {result.whyMatched.map((w) => (
          <li key={w} className="flex gap-2 text-sm">
            <span className="text-verified">✓</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Draft pitch
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{result.pitch}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => copy(result.pitch)}
      >
        {copied ? 'Copied' : 'Copy pitch'}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Based only on your CV — review and edit before sending.
      </p>
    </div>
  );
};

export default MatchPitch;
