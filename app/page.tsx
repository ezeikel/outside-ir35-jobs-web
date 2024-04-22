import type { Viewport } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import TakeHomeCalculator from '@/components/TakeHomeCalculator/TakeHomeCalculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DUMMY_JOBS } from '@/constants';
import { MapPinIcon } from 'lucide-react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const HomePage = () => {
  return (
    <PageWrap className="py-12 gap-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Find Your Next Outside IR35 Contract Role
          </h1>
          <p className="text-gray-600 mb-8">
            Search thousands of contract roles across the UK, with top companies
            and competitive rates.
          </p>
          <form className="flex">
            <Input
              className="flex-1 mr-2"
              placeholder="Job title, skills, or company"
              type="text"
            />
            <Button className="bg-primary hover:bg-primary-600" type="submit">
              Search
            </Button>
          </form>
        </div>
        <TakeHomeCalculator />
      </div>
      <section className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {DUMMY_JOBS.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>Remote · £500 - £600/day</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                {job.description.slice(0, 100)}
                ...
              </p>
              <div className="mt-4 flex items-center gap-2">
                <MapPinIcon className="size-4" />
                <span>{job.location}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">View Details</Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </PageWrap>
  );
};

export default HomePage;
