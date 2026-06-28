import type { Metadata } from 'next';
import { getDayRateBenchmarks } from '@/app/actions';
import DayRates from '@/components/DayRates/DayRates';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'UK contract day rates by skill — outside IR35',
  description:
    'Median UK contractor day rates by skill, split by IR35 position, from live outside-IR35 contracts aggregated on outsideir35jobs.com.',
};

const DayRatesPage = async () => {
  const benchmarks = await getDayRateBenchmarks();

  return (
    <PageWrap>
      <DayRates benchmarks={benchmarks} />
    </PageWrap>
  );
};

export default DayRatesPage;
