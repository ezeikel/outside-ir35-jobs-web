import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import TipTapEditor from '@/components/TipTapEditor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import cn from '@/utils/cn';
import { useEffect, useState } from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PostJobFormSchema } from '@/types';
import DayRateInputs from './DayRateInputs';

type PostJobFormProps = {
  className?: string;
};

type FormValues = z.infer<typeof PostJobFormSchema>;

const PostJobForm = ({ className }: PostJobFormProps) => {
  const [content, setContent] = useState('');
  const { control, handleSubmit, setValue } = useFormContext<FormValues>();

  const onSubmit = (values: FormValues) => {
    // TODO: handle form submission
    // eslint-disable-next-line no-console
    console.log(values);
  };

  useEffect(() => {
    setValue('jobDescription', content);
  }, [content]);

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
        <Label className="block mb-1" htmlFor="jobDescription">
          Job Description
        </Label>
        <TipTapEditor
          content={content}
          placeholder="Enter the job description"
          onChange={(c: string) => {
            setContent(c);
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
      <FormField
        control={control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Location</FormLabel>
            <FormControl>
              {/* eslint-disable-next-line react/jsx-props-no-spreading */}
              <Input placeholder="Enter the job location" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
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
      <FormField
        control={control}
        name="howToApply"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">How to Apply</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter instructions on how to apply for this job"
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
        name="applicationEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block mb-1">Application Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="Enter instructions on how to apply for this job"
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
                    <RadioGroupItem value="remote" />
                  </FormControl>
                  <FormLabel className="mt-0">Remote</FormLabel>
                </FormItem>
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="hybrid" />
                  </FormControl>
                  <FormLabel>Hybrid</FormLabel>
                </FormItem>
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="on-site" />
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
            <FormLabel className="block mb-1">Company Email</FormLabel>
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
              <Input
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
