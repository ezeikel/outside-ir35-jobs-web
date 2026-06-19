'use client';

import { ContractorDocType } from '@outside-ir35-jobs/db/types';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { uploadContractorDocument } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { DOC_LABEL } from './ContractorProfile';

const DOC_TYPES = Object.values(ContractorDocType);

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Uploading…' : 'Add to pack'}
    </Button>
  );
};

// Client form that uploads a compliance-pack document via the server action.
// Native <select>/<input> so values flow straight into the action's FormData.
const DocumentUpload = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  const action = async (formData: FormData) => {
    setError(null);
    try {
      await uploadContractorDocument(formData);
      formRef.current?.reset();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Upload failed. Please try again.',
      );
    }
  };

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">Document type</span>
        <select
          name="type"
          required
          defaultValue=""
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Choose…
          </option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOC_LABEL[t] ?? t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">File</span>
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm"
        />
      </label>

      <SubmitButton />

      {error && (
        <p className="text-sm font-medium text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
};

export default DocumentUpload;
