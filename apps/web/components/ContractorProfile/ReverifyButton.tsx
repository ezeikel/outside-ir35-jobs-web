'use client';

import { useState, useTransition } from 'react';
import { reverifyCompany } from '@/app/actions';

// Re-run the official-register checks for the contractor's company. Useful after
// fixing a number, or once the HMRC VAT check becomes available.
const ReverifyButton = ({ companyId }: { companyId: string }) => {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await reverifyCompany(companyId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not re-check.');
      }
    });
  };

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs text-link hover:underline disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Re-check'}
      </button>
    </span>
  );
};

export default ReverifyButton;
