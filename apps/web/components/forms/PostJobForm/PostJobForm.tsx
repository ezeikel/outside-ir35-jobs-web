import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { createJobPost, draftJobSpec } from '@/app/actions';
import TipTapEditor from '@/components/TipTapEditor/TipTapEditor';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PostJobFormValues } from '@/types';
import cn from '@/utils/cn';
import DayRateInputs from './DayRateInputs';
import LocationInput from './LocationInput';

// Honest labels for the poster-selectable IR35 signal — always the CLIENT's
// position, never an assertion by us.
const IR35_OPTIONS: { value: JobIR35Signal; label: string }[] = [
  {
    value: JobIR35Signal.CLIENT_INTENDS_OUTSIDE,
    label: 'Client states: outside IR35',
  },
  { value: JobIR35Signal.SDS_ISSUED, label: 'Outside — SDS issued by client' },
  {
    value: JobIR35Signal.CONTRACT_REVIEW_HELD,
    label: 'Outside — IR35 contract review held',
  },
  {
    value: JobIR35Signal.SMALL_CLIENT_EXEMPT,
    label: 'Small client — contractor self-determines',
  },
  { value: JobIR35Signal.UNKNOWN, label: 'Not stated' },
  { value: JobIR35Signal.INSIDE, label: 'Inside IR35' },
];

interface PostJobFormProps {
  className?: string;
}

const PostJobForm = ({ className }: PostJobFormProps) => {
  const [descriptionContent, setDescriptionContent] = useState('');
  const [howToApplyContent, setHowToApplyContent] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useFormContext<PostJobFormValues>();

  // Draft the description / how-to-apply / keywords from the title + a few fields.
  const draftWithAi = async () => {
    setDraftError(null);
    const values = getValues();
    if (!values.position?.trim()) {
      setDraftError('Add a role title first.');
      return;
    }
    setDrafting(true);
    try {
      const draft = await draftJobSpec({
        position: values.position,
        skills: values.keywords,
        workMode: values.workMode,
        dayRate: Array.isArray(values.dayRate)
          ? values.dayRate.join('–')
          : undefined,
        location: values.location?.address,
      });
      setDescriptionContent(draft.description);
      setHowToApplyContent(draft.howToApply);
      if (draft.keywords) setValue('keywords', draft.keywords);
    } catch (e) {
      setDraftError(
        e instanceof Error ? e.message : 'Could not draft right now.',
      );
    } finally {
      setDrafting(false);
    }
  };

  const onSubmit = async (values: PostJobFormValues) => {
    // createJobPost creates the job unpublished and returns a Stripe Checkout
    // URL; the job only goes live after payment (webhook). Send the browser to
    // Stripe's hosted checkout. On failure (e.g. billing misconfigured) surface a
    // message rather than leaving the button stuck on "Redirecting…".
    setSubmitError(null);
    try {
      const { checkoutUrl } = await createJobPost(values);
      window.location.assign(checkoutUrl);
    } catch (e) {
      // Resolve (don't re-throw) so react-hook-form clears isSubmitting and the
      // poster can retry; the error is shown by the submit button.
      setSubmitError(
        e instanceof Error
          ? e.message
          : 'Could not start checkout. Please try again.',
      );
    }
  };

  useEffect(() => {
    setValue('description', descriptionContent);
  }, [descriptionContent, setValue]);

  useEffect(() => {
    setValue('howToApply', howToApplyContent);
  }, [howToApplyContent, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn({
        [className as string]: !!className,
      })}
    >
      <FormField
        control={control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Company Name</FormLabel>
            <FormControl>
              {}
              <Input placeholder="Enter your company name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="position"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Position</FormLabel>
            <FormControl>
              {}
              <Input placeholder="Enter the job position" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label htmlFor="description">Job Description</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={draftWithAi}
            disabled={drafting}
          >
            {drafting ? 'Drafting…' : '✦ Draft with AI'}
          </Button>
        </div>
        {draftError ? (
          <p className="mb-1 text-sm text-destructive">{draftError}</p>
        ) : null}
        <p className="mb-2 text-xs text-muted-foreground">
          Drafts the description, how-to-apply and keywords from your title and
          details. It never claims a role is outside IR35 — you set your IR35
          position below.
        </p>
        <TipTapEditor
          content={descriptionContent}
          placeholder="Enter the job description"
          onChange={(c: string) => {
            setDescriptionContent(c);
          }}
        />
      </div>
      <FormField
        control={control}
        name="keywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Keywords</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter relevant keywords (e.g. React, Node.js)"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <LocationInput />
      <FormField
        control={control}
        name="companyLogo"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Company Logo</FormLabel>
            <FormControl>
              <Input
                accept="image/*"
                placeholder="Upload your company logo"
                type="file"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DayRateInputs />
      <div>
        <Label className="block mb-1" htmlFor="howToApply">
          How to Apply
        </Label>
        <TipTapEditor
          content={howToApplyContent}
          placeholder="Enter instructions on how to apply for this job"
          onChange={(c: string) => {
            setHowToApplyContent(c);
          }}
        />
      </div>
      <FormField
        control={control}
        name="applicationEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">
              Email to get job applications
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="Apply email address"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="workMode"
        // TODO: how to handle radio buttons
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Work Mode</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                className="flex items-center gap-4"
              >
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value={WorkMode.REMOTE} />
                  </FormControl>
                  <FormLabel className="mt-0">Remote</FormLabel>
                </FormItem>
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value={WorkMode.HYBRID} />
                  </FormControl>
                  <FormLabel>Hybrid</FormLabel>
                </FormItem>
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value={WorkMode.ON_SITE} />
                  </FormControl>
                  <FormLabel>On-site</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="ir35Signal"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">IR35 position</FormLabel>
            <FormControl>
              <Select
                onValueChange={field.onChange}
                value={field.value as string | undefined}
              >
                <SelectTrigger aria-label="IR35 position">
                  <SelectValue placeholder="What does the client say about IR35?" />
                </SelectTrigger>
                <SelectContent>
                  {IR35_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="ir35Attested"
        render={({ field }) => (
          <FormItem>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              <span className="text-muted-foreground">
                I confirm this reflects the client&rsquo;s stated IR35 position.
                The platform does not determine, verify or warrant IR35 status —
                the SDS is the client&rsquo;s legal responsibility.
              </span>
            </label>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="companyTwitter"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">
              Company Twitter (Optional)
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your company's Twitter handle"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="companyEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">
              Company Email (stays private, for invoices)
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="Enter your company email"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="invoiceAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Invoice Address</FormLabel>
            <FormControl>
              <Textarea placeholder="Enter your invoice address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-col items-end gap-2">
        <Button
          className="bg-primary text-white"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Redirecting to payment…' : 'Post Job - £219'}
        </Button>
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          You’ll be taken to secure checkout. Your listing goes live once
          payment is confirmed.
        </p>
      </div>
    </form>
  );
};

export default PostJobForm;
