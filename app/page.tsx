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
    <PageWrap className="pb-12 gap-y-8 p-0">
      <div className="relative w-screen">
        <video
          className="size-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          style={{
            minHeight: 'calc(100vh - 68px)',
          }}
        >
          <source src="/videos/man-using-laptop.mp4" type="video/mp4" />
          Your browser does not support the video tag.
          <track kind="captions" />
        </video>
        <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-[rgba(0,0,0,0.4)]">
          <div>
            <h1 className="text-4xl font-bold mb-4 text-white">
              Find Your Next Outside IR35 Contract Role
            </h1>
            <p className="text-gray-100 mb-8">
              Search thousands of contract roles across the UK, with top
              companies and competitive rates.
            </p>
            <form className="flex gap-2">
              <Input
                className="flex-1 max-w-[640px]"
                placeholder="Job title, skills, or company"
                type="text"
              />
              <Button className="bg-primary hover:bg-primary-600" type="submit">
                Search
              </Button>
            </form>
          </div>
          <TakeHomeCalculator className="hidden md:block" />
        </div>
      </div>
      <section className="flex flex-col gap-y-8 p-4">
        <h2 className="font-open-sans text-3xl font-bold">Latest Contracts</h2>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        </div>
      </section>
    </PageWrap>
  );
};

export default HomePage;
