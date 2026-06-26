'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createApplication } from '@/app/actions';
import { useToast } from '@/components/ui/use-toast';
import type { ApplyEligibility } from '@/lib/apply/eligibility';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

/**
 * The apply control on a job page. Server-computed eligibility decides which
 * state we render — apply form, already-applied, sign-in prompt, external
 * link-out (aggregated), or hidden (own job / poster). One client component so
 * the optional cover message + submit are interactive.
 */
const ApplyButton = ({
  jobId,
  eligibility,
  sourceUrl,
}: {
  jobId: string;
  eligibility: ApplyEligibility;
  sourceUrl: string | null;
}) => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState('');

  // Aggregated listings (and any job with no on-platform owner) link out.
  if (!eligibility.ok && eligibility.reason === 'aggregated') {
    if (!sourceUrl) return null;
    return (
      <>
        <Button asChild className="mt-5 w-full">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Apply on the original listing
          </a>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          This role is aggregated from an external source.
        </p>
      </>
    );
  }

  if (!eligibility.ok && eligibility.reason === 'not_signed_in') {
    return (
      <Button asChild className="mt-5 w-full">
        <Link href="/api/auth/signin">Sign in to apply</Link>
      </Button>
    );
  }

  // Own job, or a not-yet-onboarded viewer: no apply control.
  if (
    !eligibility.ok &&
    (eligibility.reason === 'own_job' || eligibility.reason === 'not_onboarded')
  ) {
    return null;
  }

  if (!eligibility.ok && eligibility.reason === 'inactive') {
    return (
      <p className="mt-5 rounded-md border border-border bg-card/50 p-3 text-center text-sm text-muted-foreground">
        This role is no longer accepting applications.
      </p>
    );
  }

  if (
    applied ||
    (!eligibility.ok && eligibility.reason === 'already_applied')
  ) {
    return (
      <p className="mt-5 rounded-md border border-verified/40 bg-card/50 p-3 text-center text-sm text-verified">
        ✓ You’ve applied — the poster can see your verified profile.
      </p>
    );
  }

  const onApply = () => {
    startTransition(async () => {
      try {
        await createApplication(jobId, message);
        setApplied(true);
        toast({
          title: 'Application sent',
          description: 'The poster can now see your verified profile.',
        });
      } catch (e) {
        toast({
          title: 'Could not apply',
          description: e instanceof Error ? e.message : 'Please try again.',
        });
      }
    });
  };

  return (
    <div className="mt-5">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a short note to the poster (optional)"
        rows={3}
        maxLength={1000}
        className="mb-2 text-sm"
      />
      <Button className="w-full" onClick={onApply} disabled={pending}>
        {pending ? 'Applying…' : 'Apply with verified profile'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        One click — share your verified compliance pack.
      </p>
    </div>
  );
};

export default ApplyButton;
