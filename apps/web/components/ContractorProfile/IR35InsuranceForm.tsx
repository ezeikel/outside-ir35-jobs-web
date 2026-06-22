'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { setIr35Insurance } from '@/app/actions';
import { Button } from '@/components/ui/button';

const fieldClass =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm';

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  );
};

type Props = {
  holds: boolean;
  provider: string | null;
  expiresAt: Date | string | null;
};

const toDateInput = (d: Date | string | null): string => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

/**
 * Self-declared IR35 / tax-investigation insurance. The contractor STATES they
 * hold cover (provider + expiry) — we can't verify a policy against a register, so
 * this is surfaced attributed to them, never as a platform guarantee. Lets them
 * add, update, or remove it. (Insurance is an orthogonal trust badge, not a tier
 * gate — see docs/ir35-trust-model.md.)
 */
const IR35InsuranceForm = ({ holds, provider, expiresAt }: Props) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!holds);

  const save = async (formData: FormData) => {
    setError(null);
    const expiry = String(formData.get('expiresAt') ?? '').trim();
    try {
      await setIr35Insurance({
        holds: true,
        provider: String(formData.get('provider') ?? '').trim() || undefined,
        expiresAt: expiry ? new Date(expiry) : undefined,
      });
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save your insurance details.',
      );
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await setIr35Insurance({ holds: false });
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the cover.');
    }
  };

  if (holds && !editing) {
    // Confirmed-on-file view with edit/remove. The display row is rendered by the
    // parent (VerifiedFactRow); here we only offer the controls.
    return (
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Update
        </Button>
        <Button variant="ghost" size="sm" onClick={remove}>
          Remove
        </Button>
        {error ? (
          <span className="text-sm text-destructive">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <form ref={formRef} action={save} className="mt-2 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Provider</span>
          <input
            name="provider"
            defaultValue={provider ?? ''}
            placeholder="e.g. Qdos, Markel Tax"
            className={fieldClass}
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Expiry date</span>
          <input
            name="expiresAt"
            type="date"
            defaultValue={toDateInput(expiresAt)}
            className={fieldClass}
            required
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Self-declared. We show your provider and expiry to employers as a fact
        you state — we don’t verify the policy or treat it as an IR35-status
        guarantee.
      </p>
      <div className="flex gap-2">
        <SubmitButton label={holds ? 'Save' : 'Add cover'} />
        {holds ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
};

export default IR35InsuranceForm;
