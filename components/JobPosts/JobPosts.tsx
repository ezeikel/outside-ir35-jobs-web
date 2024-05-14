import { getJobs } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';

const JobPosts = async () => {
  const jobPosts = await getJobs();

  if (!jobPosts) {
    return null;
  }

  if (!jobPosts.length) {
    return (
      <PageWrap className="gap-y-16">
        <h1 className="font-sans text-4xl font-bold text-center">
          No jobs found
        </h1>
      </PageWrap>
    );
  }

  return (
    <PageWrap className="gap-y-16">
      <div key="1" className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between space-x-4">
            <Input
              aria-label="Search for jobs"
              className="flex-grow"
              placeholder="Job title, keywords or company"
            />
            <Input
              aria-label="Location"
              className="flex-grow"
              placeholder="City, county or postcode"
            />
            <Button variant="default">Find jobs</Button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Select>
              <SelectTrigger id="date-posted">
                <SelectValue placeholder="Date posted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Anytime</SelectItem>
                <SelectItem value="past-week">Past week</SelectItem>
                <SelectItem value="past-month">Past month</SelectItem>
                <SelectItem value="past-24-hours">Past 24 hours</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger id="experience-level">
                <SelectValue placeholder="Experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry-level">Entry level</SelectItem>
                <SelectItem value="associate">Associate</SelectItem>
                <SelectItem value="mid-senior-level">
                  Mid-Senior level
                </SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger id="company">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company-1">Company 1</SelectItem>
                <SelectItem value="company-2">Company 2</SelectItem>
                <SelectItem value="company-3">Company 3</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger id="remote">
                <SelectValue placeholder="Remote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="on-site">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center">
            <Label className="mr-4" htmlFor="distance">
              Distance:
            </Label>
            <input
              aria-label="Select distance"
              className="slider w-full"
              id="distance"
              max="100"
              min="0"
              type="range"
            />
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Jobs for you</h2>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {jobPosts.map((jobPost) => (
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>{jobPost.position}</CardTitle>
                    <CardDescription>
                      <span className="block font-normal mb-2">
                        {jobPost.companyName}
                      </span>
                      <Badge variant="secondary">{jobPost.workMode}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-2">
                      <p>£{jobPost.dayRate} per day</p>
                      <p>{jobPost.description}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline">Save</Button>
                    <Button>Apply now</Button>
                  </CardFooter>
                </Card>
              ))}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Software Engineer (Full Stack)</CardTitle>
                  <CardDescription>
                    <span className="block font-normal mb-2">
                      Be Amazed Media Ltd
                    </span>
                    <Badge variant="secondary">Hybrid work</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <p>From £70,000 a year - Full-time</p>
                    <p>Monday to Friday +3</p>
                    <p>Easily apply</p>
                    <p>
                      These tools integrate with various social media APIs to
                      help us track and extract data from our content which help
                      to inform our future content pipeline as well as optimise
                      our current library.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline">Save</Button>
                  <Button>Apply now</Button>
                </CardFooter>
              </Card>
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Software Engineer (Full Stack)</CardTitle>
                  <CardDescription>
                    <span className="block font-normal mb-2">
                      Be Amazed Media Ltd
                    </span>
                    <Badge variant="secondary">Hybrid work</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <p>From £70,000 a year - Full-time</p>
                    <p>Monday to Friday +3</p>
                    <p>Easily apply</p>
                    <p>
                      These tools integrate with various social media APIs to
                      help us track and extract data from our content which help
                      to inform our future content pipeline as well as optimise
                      our current library.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline">Save</Button>
                  <Button>Apply now</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageWrap>
  );
};

export default JobPosts;
