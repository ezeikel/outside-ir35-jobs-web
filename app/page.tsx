import PageWrap from '@/components/PageWrap/PageWrap';
import TakeHomeCalculator from '@/components/TakeHomeCalculator/TakeHomeCalculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HomePage = () => {
  return (
    <PageWrap>
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              Find Your Next Outside IR35 Contract Role
            </h1>
            <p className="text-gray-600 mb-8">
              Search thousands of contract roles across the UK, with top
              companies and competitive rates.
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
      </div>
    </PageWrap>
  );
};

export default HomePage;
