import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { WorkMode } from '@prisma/client';
import TipTapEditor from '@/components/TipTapEditor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import cn from '@/utils/cn';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PostJobFormValues } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { createJobPost } from '@/app/actions';
import DayRateInputs from './DayRateInputs';
import LocationInput from './LocationInput';

type PostJobFormProps = {
  className?: string;
};

const PostJobForm = ({ className }: PostJobFormProps) => {
  const [descriptionContent, setDescriptionContent] = useState('');
  const [howToApplyContent, setHowToApplyContent] = useState('');
  const { control, handleSubmit, setValue } =
    useFormContext<PostJobFormValues>();

  const onSubmit = async (values: PostJobFormValues) => {
    // eslint-disable-next-line no-console
    console.log('PostJobForm onSubmit()', values);

    await createJobPost(values);
  };

  useEffect(() => {
    setValue('description', descriptionContent);
  }, [descriptionContent]);

  useEffect(() => {
    setValue('howToApply', howToApplyContent);
  }, [howToApplyContent]);

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
              {/* eslint-disable-next-line react/jsx-props-no-spreading */}
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
              {/* eslint-disable-next-line react/jsx-props-no-spreading */}
              <Input placeholder="Enter the job position" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div>
        <Label className="block mb-1" htmlFor="description">
          Job Description
        </Label>
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
                // eslint-disable-next-line react/jsx-props-no-spreading
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
                // eslint-disable-next-line react/jsx-props-no-spreading
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
                // eslint-disable-next-line react/jsx-props-no-spreading
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
        name="companyTwitter"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">
              Company Twitter (Optional)
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your company's Twitter handle"
                // eslint-disable-next-line react/jsx-props-no-spreading
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
                // eslint-disable-next-line react/jsx-props-no-spreading
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
              <Textarea
                placeholder="Enter your invoice address"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-end">
        <Button className="bg-primary text-white" type="submit">
          Post Job - £219
        </Button>
      </div>
    </form>
  );
};

export default PostJobForm;
