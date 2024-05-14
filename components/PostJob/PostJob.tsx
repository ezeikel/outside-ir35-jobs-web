'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PostJobFormSchema } from '@/types';
import PostJobPreview from '../PostJobPreview/PostJobPreview';
import PostJobForm from '../forms/PostJobForm/PostJobForm';
import { Form } from '../ui/form';

const PostJob = () => {
  const form = useForm<z.infer<typeof PostJobFormSchema>>({
    resolver: zodResolver(PostJobFormSchema),
    defaultValues: {
      companyName: '',
      position: '',
      description: '',
      keywords: '',
      location: {
        address: '',
        placeId: '',
        coordinates: {
          lat: null,
          lng: null,
        },
      },
      companyLogo: '',
      dayRate: [0],
      howToApply: '',
      applicationEmail: '',
      workMode: undefined,
      companyTwitter: '',
      companyEmail: '',
      invoiceAddress: '',
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <Form {...form}>
        <PostJobForm className="space-y-6" />
        <PostJobPreview />
      </Form>
    </div>
  );
};

export default PostJob;
