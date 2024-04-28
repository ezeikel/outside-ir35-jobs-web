import PageWrap from '@/components/PageWrap/PageWrap';
import PostJob from '@/components/PostJob/PostJob';

const JobPostPage = () => {
  return (
    <PageWrap>
      <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
      <PostJob />
    </PageWrap>
  );
};

export default JobPostPage;
