import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TakeHomeCalculator = () => {
  return (
    <div className="max-w-md mx-auto p-4 sm:p-8 bg-white rounded-lg shadow-md">
      <div className="space-y-4">
        <h1 className="font-open-sans text-2xl font-semibold">
          Take Home Calculator
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Estimate your take-home pay as an outside IR35 contractor in the UK.
        </p>
      </div>
      <form className="grid gap-4 mt-6">
        <div>
          <Label className="mb-2" htmlFor="dayRate">
            Day Rate (£)
          </Label>
          <Input
            id="dayRate"
            placeholder="Enter your day rate"
            step="0.01"
            type="number"
          />
        </div>
        <div>
          <Label className="mb-2" htmlFor="daysWorked">
            Days Worked
          </Label>
          <Input
            id="daysWorked"
            placeholder="Number of days worked"
            type="number"
          />
        </div>
        <div>
          <Label className="mb-2" htmlFor="annualSalary">
            Annual Salary (£)
          </Label>
          <Input
            id="annualSalary"
            placeholder="Enter your annual salary"
            step="0.01"
            type="number"
          />
        </div>
        <div>
          <Label className="mb-2" htmlFor="dividends">
            Annual Dividends (£)
          </Label>
          <Input
            id="dividends"
            placeholder="Enter your annual dividends"
            step="0.01"
            type="number"
          />
        </div>
        <div className="flex justify-between items-center mt-6">
          <div>
            <p className="text-sm font-semibold">Estimated Net Income</p>
            <p className="text-3xl font-bold">£45,000</p>
          </div>
          <Button className="bg-primary hover:bg-primary-600" type="submit">
            Calculate
          </Button>
        </div>
      </form>
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">How it works</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            Enter your day rate, number of days worked, annual salary, and
            annual dividends.
          </li>
          <li>
            We&apos;ll calculate your estimated gross income based on your
            inputs.
          </li>
          <li>
            We&apos;ll then deduct applicable taxes and expenses to estimate
            your net income.
          </li>
        </ol>
      </div>
    </div>
  );
};

export default TakeHomeCalculator;
