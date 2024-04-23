import PageWrap from '@/components/PageWrap/PageWrap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const JobPostPage = () => {
  return (
    <PageWrap className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
        <form className="space-y-6">
          <div>
            <Label className="block mb-1" htmlFor="companyName">
              Company Name
            </Label>
            <Input id="companyName" placeholder="Enter your company name" />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="position">
              Position
            </Label>
            <Input id="position" placeholder="Enter the job position" />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="jobDescription">
              Job Description
            </Label>
            <Textarea
              id="jobDescription"
              placeholder="Enter the job description"
              rows={4}
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="keywords">
              Keywords
            </Label>
            <Input
              id="keywords"
              placeholder="Enter relevant keywords (e.g. React, Node.js)"
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="location">
              Location
            </Label>
            <Input id="location" placeholder="Enter the job location" />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="companyLogo">
              Company Logo
            </Label>
            <Input
              accept="image/*"
              id="companyLogo"
              placeholder="Upload your company logo"
              type="file"
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="dayRate">
              Day Rate
            </Label>
            <div className="flex items-center space-x-4">
              <Input
                id="dayRate"
                placeholder="Enter the day rate"
                type="number"
              />
              <span>or</span>
              <div className="flex items-center space-x-2">
                <Input
                  className="w-20"
                  id="dayRateMin"
                  placeholder="Min"
                  type="number"
                />
                <span>-</span>
                <Input
                  className="w-20"
                  id="dayRateMax"
                  placeholder="Max"
                  type="number"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="block mb-1" htmlFor="howToApply">
              How to Apply
            </Label>
            <Textarea
              id="howToApply"
              placeholder="Enter instructions on how to apply for this job"
              rows={4}
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="applicationEmail">
              Application Email
            </Label>
            <Input
              id="applicationEmail"
              placeholder="Enter the email to receive job applications"
              type="email"
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="workMode">
              Work Mode
            </Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Input
                  id="workModeRemote"
                  name="workMode"
                  type="radio"
                  value="remote"
                />
                <Label className="ml-2" htmlFor="workModeRemote">
                  Remote
                </Label>
              </div>
              <div className="flex items-center">
                <Input
                  id="workModeHybrid"
                  name="workMode"
                  type="radio"
                  value="hybrid"
                />
                <Label className="ml-2" htmlFor="workModeHybrid">
                  Hybrid
                </Label>
              </div>
              <div className="flex items-center">
                <Input
                  id="workModeOffice"
                  name="workMode"
                  type="radio"
                  value="office"
                />
                <Label className="ml-2" htmlFor="workModeOffice">
                  Office
                </Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="block mb-1" htmlFor="companyTwitter">
              Company Twitter (Optional)
            </Label>
            <Input
              id="companyTwitter"
              placeholder="Enter your company's Twitter handle"
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="companyEmail">
              Company Email
            </Label>
            <Input
              id="companyEmail"
              placeholder="Enter your company email"
              type="email"
            />
          </div>
          <div>
            <Label className="block mb-1" htmlFor="invoiceAddress">
              Invoice Address
            </Label>
            <Textarea
              id="invoiceAddress"
              placeholder="Enter your invoice address"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button className="bg-primary text-white" type="submit">
              Post Job - £219
            </Button>
          </div>
        </form>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Job Preview</h2>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-bold">Front-End Developer</h3>
          <p className="text-gray-600 mb-2">Acme Inc.</p>
          <p className="text-gray-600 mb-4">San Francisco, CA</p>
          <p className="text-gray-700 mb-4">
            We are seeking a talented Front-End Developer to join our team. You
            will be responsible for building and maintaining our web
            applications using modern technologies such as React, Vue, or
            Angular.
          </p>
          <p className="text-gray-700 mb-2">Key Responsibilities:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>Develop and implement user interface components</li>
            <li>Collaborate with designers and back-end developers</li>
            <li>Optimize application performance</li>
          </ul>
          <p className="text-gray-700 mb-2">Requirements:</p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>3+ years of experience with front-end development</li>
            <li>Proficient in JavaScript, HTML, and CSS</li>
            <li>Experience with React, Vue, or Angular</li>
          </ul>
          <p className="text-gray-700 mb-4">
            To apply, please send your resume to jobs@acmeinc.com.
          </p>
        </div>
      </div>
    </PageWrap>
  );
};

export default JobPostPage;
