'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addLimitedCompany,
  type CompanyVerificationResult,
} from '@/app/actions';
import { Button } from '@/components/ui/button';

const fieldClass =
  'h-9 rounded-md border border-border bg-background px-3 text-sm';

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Verifying…' : 'Add & verify'}
    </Button>
  );
};

const CHECK_COPY: Record<string, string> = {
  verified: '✓ verified',
  not_found: '✗ not found on the register',
  inactive: '✗ not active',
  pending: '⏳ check coming soon',
  error: '· couldn’t check right now',
};

// Actionable next-step guidance based on the Companies House result (the one the
// contractor can act on). Returns null when nothing useful to add (verified).
const chNextStep = (status: string): string | null => {
  switch (status) {
    case 'not_found':
      return 'Double-check the company number on your Companies House record — it should be 8 characters (e.g. 12345678 or SC123456).';
    case 'inactive':
      return 'That company isn’t active on the register (e.g. dissolved or in liquidation), so we can’t verify it.';
    case 'error':
      return 'We couldn’t reach Companies House just now — please try again in a moment.';
    default:
      return null;
  }
};

// Lets a contractor add their limited company; verification runs on submit.
// Companies House is checked instantly; VAT shows "coming soon" until HMRC creds
// are configured.
const AddCompanyForm = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyVerificationResult | null>(null);

  const action = async (formData: FormData) => {
    setError(null);
    setResult(null);
    try {
      const res = await addLimitedCompany({
        name: String(formData.get('name') ?? ''),
        incorporationNumber: String(formData.get('incorporationNumber') ?? ''),
        vatNumber: String(formData.get('vatNumber') ?? ''),
      });
      setResult(res);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the company.');
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <p className="mb-1 text-sm font-medium">Add your limited company</p>
      <p className="mb-3 text-sm text-muted-foreground">
        We check it against Companies House and HMRC — we only record what the
        official registers confirm.
      </p>
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Company name</span>
          <input type="text" name="name" required className={fieldClass} />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Company number</span>
            <input
              type="text"
              name="incorporationNumber"
              required
              placeholder="e.g. 12345678"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">VAT number</span>
            <input
              type="text"
              name="vatNumber"
              required
              placeholder="e.g. GB123456789"
              className={fieldClass}
            />
          </label>
        </div>
        <div>
          <SubmitButton />
        </div>
      </form>

      {result && (
        <div className="mt-3 space-y-1 text-sm">
          <p>Companies House: {CHECK_COPY[result.companies_house]}</p>
          <p>HMRC VAT: {CHECK_COPY[result.vat]}</p>
          {chNextStep(result.companies_house) ? (
            <p className="text-muted-foreground">
              {chNextStep(result.companies_house)}
            </p>
          ) : null}
          {result.vat === 'pending' ? (
            <p className="text-muted-foreground">
              VAT checks aren’t live yet — we’ll verify your VAT number
              automatically once enabled. Your company is still added.
            </p>
          ) : null}
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
      )}
    </section>
  );
};

export default AddCompanyForm;
