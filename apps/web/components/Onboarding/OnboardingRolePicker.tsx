'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PosterType, Role } from '@outside-ir35-jobs/db/types';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { setUserRole } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { OnboardingRoleSchema, OnboardingRoleValues } from '@/types';
import cn from '@/utils/cn';

const ROLE_OPTIONS: { value: Role; title: string; blurb: string }[] = [
  {
    value: Role.JOB_SEEKER,
    title: 'I’m a contractor',
    blurb: 'Build a verified profile and find outside-IR35 contracts.',
  },
  {
    value: Role.JOB_POSTER,
    title: 'I’m hiring',
    blurb: 'Post roles and reach verified limited-company contractors.',
  },
];

const POSTER_TYPE_OPTIONS: { value: PosterType; label: string }[] = [
  { value: PosterType.DIRECT, label: 'Hiring directly (end client)' },
  { value: PosterType.RECRUITER, label: 'Recruiter / agency' },
];

// A selectable card wrapping a radio item — the whole card is the label.
const OptionCard = ({
  selected,
  title,
  blurb,
  value,
}: {
  selected: boolean;
  title: string;
  blurb?: string;
  value: string;
}) => (
  <FormLabel
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 font-normal transition-colors hover:border-foreground/30',
      selected && 'border-foreground ring-1 ring-foreground',
    )}
  >
    <FormControl>
      <RadioGroupItem value={value} className="mt-1" />
    </FormControl>
    <span className="space-y-0.5">
      <span className="block text-base font-medium">{title}</span>
      {blurb && (
        <span className="block text-sm text-muted-foreground">{blurb}</span>
      )}
    </span>
  </FormLabel>
);

const OnboardingRolePicker = () => {
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const form = useForm<OnboardingRoleValues>({
    resolver: zodResolver(OnboardingRoleSchema),
    defaultValues: { role: undefined, posterType: undefined },
  });

  const role = form.watch('role');

  const onSubmit = async (values: OnboardingRoleValues) => {
    try {
      await setUserRole(values);
      // Refresh the session so the header + gates see role/onboarded immediately.
      await update();
      router.push(values.role === Role.JOB_SEEKER ? '/profile' : '/jobs');
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'We couldn’t save your choice. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="gap-3"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      value={opt.value}
                      title={opt.title}
                      blurb={opt.blurb}
                      selected={field.value === opt.value}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {role === Role.JOB_POSTER && (
          <FormField
            control={form.control}
            name="posterType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Are you hiring directly or recruiting?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="gap-3"
                  >
                    {POSTER_TYPE_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        value={opt.value}
                        title={opt.label}
                        selected={field.value === opt.value}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    </Form>
  );
};

export default OnboardingRolePicker;
