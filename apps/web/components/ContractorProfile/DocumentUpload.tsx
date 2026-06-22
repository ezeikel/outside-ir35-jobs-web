'use client';

import { ContractorDocType } from '@outside-ir35-jobs/db/types';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { uploadContractorDocument } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { isInsuranceType, tracksExpiry } from '@/lib/documents/validate';
import { DOC_LABEL } from './ContractorProfile';

// The documents a contractor self-uploads to their pack. Excludes the types
// proven by official-register checks (INCORPORATION + VAT_CERTIFICATE are verified
// via the company against Companies House / HMRC — a self-uploaded PDF would be
// weaker and ambiguous vs the register check) and the catch-all OTHER.
const REGISTER_VERIFIED = new Set<ContractorDocType>([
  ContractorDocType.INCORPORATION,
  ContractorDocType.VAT_CERTIFICATE,
  ContractorDocType.OTHER,
]);
const DOC_TYPES = Object.values(ContractorDocType).filter(
  (t) => !REGISTER_VERIFIED.has(t),
);

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Uploading…' : 'Add to pack'}
    </Button>
  );
};

const fieldClass =
  'h-9 rounded-md border border-border bg-background px-3 text-sm';

// Client form that uploads a compliance-pack document via the server action.
// Native <select>/<input> so values flow straight into the action's FormData.
// Insurance/right-to-work types reveal expiry (and insurer/cover for insurance).
const DocumentUpload = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');

  const showExpiry = tracksExpiry(type);
  const showInsurance = isInsuranceType(type);

  const action = async (formData: FormData) => {
    setError(null);
    try {
      await uploadContractorDocument(formData);
      formRef.current?.reset();
      setType('');
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
      className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Document type</span>
          <select
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={fieldClass}
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

        {!showExpiry && <SubmitButton />}
      </div>

      {showExpiry && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {showInsurance && (
            <>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">Insurer</span>
                <input
                  type="text"
                  name="insurer"
                  placeholder="e.g. Qdos, Markel"
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">Cover limit (£)</span>
                <input
                  type="number"
                  name="coverLimit"
                  min="1"
                  step="1"
                  placeholder="1000000"
                  className={fieldClass}
                />
              </label>
            </>
          )}
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">
              Expiry{showInsurance ? '' : ' (if applicable)'}
            </span>
            <input type="date" name="expiresAt" className={fieldClass} />
          </label>
          <SubmitButton />
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </form>
  );
};

export default DocumentUpload;
