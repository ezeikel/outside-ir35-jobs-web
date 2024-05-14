import { getJob } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import { Button } from '../ui/button';

type JobPostProps = {
  id: string;
};

const JobPost = async ({ id }: JobPostProps) => {
  const job = await getJob(id);

  if (!job) {
    return null;
  }

  return (
    <PageWrap className="gap-y-16">
      <h1 className="font-sans text-4xl font-bold text-center">
        {job.position}
      </h1>
      <p className="text-center text-gray-600">{job.companyName}</p>
      <div className="flex justify-end">
        <Button className="bg-primary text-white" type="submit">
          Apply for this job
        </Button>
      </div>
    </PageWrap>
  );
};

export default JobPost;
