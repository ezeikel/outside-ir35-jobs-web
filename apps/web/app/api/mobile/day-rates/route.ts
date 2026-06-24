import { NextResponse } from 'next/server';
import { getDayRateBenchmarks } from '@/app/actions';
import { toMobileDayRates } from '@/lib/mobile/day-rates-dto';

// Day-rate benchmarks for mobile. Wraps getDayRateBenchmarks(), which is already
// MIN_SAMPLE-gated in SQL — so the app can only ever show rates backed by enough
// listings to be honest. Public (the web /day-rates page is public too).
export const runtime = 'nodejs';

export const GET = async () => {
  const benchmarks = await getDayRateBenchmarks();
  return NextResponse.json(toMobileDayRates(benchmarks));
};
