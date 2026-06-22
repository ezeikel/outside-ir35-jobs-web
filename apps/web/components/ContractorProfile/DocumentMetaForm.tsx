'use client';

import { useState } from 'react';
import { setDocumentMetadata } from '@/app/actions';
import { isInsuranceType } from '@/lib/documents/validate';

type Props = {
  documentId: string;
  type: string;
  insurer: string | null;
  coverLimit: number | null;
  expiresAt: Date | string | null;
};

const toDateInput = (d: Date | string | null): string => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); // yyyy-mm-dd
};

const fieldClass =
  'h-8 rounded-md border border-border bg-background px-2 text-sm';

// Inline "Edit details" for a document's insurer / cover / expiry. Shown only for
// expiry-tracking docs. Saving recomputes the doc's status server-side.
const DocumentMetaForm = ({
  documentId,
  type,
  insurer,
  coverLimit,
  expiresAt,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insurance = isInsuranceType(type);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-7 text-xs text-link hover:underline"
      >
        Edit details
      </button>
    );
  }

  const onSubmit = async (formData: FormData) => {
    setError(null);
    setSaving(true);
    try {
      await setDocumentMetadata(documentId, {
        insurer: (formData.get('insurer') as string) || undefined,
        coverLimit: (formData.get('coverLimit') as string) || undefined,
        expiresAt: (formData.get('expiresAt') as string) || undefined,
      });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      action={onSubmit}
      className="ml-7 mt-1 flex flex-wrap items-end gap-2"
    >
      <p className="basis-full text-xs text-muted-foreground">
        {insurance
          ? 'Insurer, cover and expiry are all needed for this to count toward your compliance tier.'
          : 'Add the expiry date so we can keep this document’s status in date.'}
      </p>
      {insurance && (
        <>
          <input
            type="text"
            name="insurer"
            defaultValue={insurer ?? ''}
            placeholder="Insurer"
            className={`${fieldClass} w-32`}
          />
          <input
            type="number"
            name="coverLimit"
            min="1"
            step="1"
            defaultValue={coverLimit ?? ''}
            placeholder="Cover £"
            className={`${fieldClass} w-28`}
          />
        </>
      )}
      <input
        type="date"
        name="expiresAt"
        defaultValue={toDateInput(expiresAt)}
        className={fieldClass}
      />
      <button
        type="submit"
        disabled={saving}
        className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
      {error && (
        <span className="basis-full text-xs text-destructive">{error}</span>
      )}
    </form>
  );
};

export default DocumentMetaForm;
