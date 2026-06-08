import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const DayRateInputs = () => {
  const { control, setValue, watch } = useFormContext();
  const dayRateValue = watch('dayRate');
  const [dayRateSingle, setDayRateSingle] = useState(dayRateValue?.[0] || '');
  const [dayRateMin, setDayRateMin] = useState(dayRateValue?.[0] || '');
  const [dayRateMax, setDayRateMax] = useState(dayRateValue?.[1] || '');

  // update form value when single day rate is changed
  const handleSingleChange = (value: string) => {
    setDayRateSingle(value);
    setValue('dayRate', value ? [parseFloat(value)] : []);
  };

  // update form value when min or max is changed
  const handleRangeChange = (minOrMax: 'min' | 'max', value: string) => {
    const min = minOrMax === 'min' ? parseFloat(value) : parseFloat(dayRateMin);
    const max = minOrMax === 'max' ? parseFloat(value) : parseFloat(dayRateMax);

    if (minOrMax === 'min') {
      setDayRateMin(value);
    } else {
      setDayRateMax(value);
    }

    setValue('dayRate', min || max ? [min, max] : []);
  };

  // resolve to single day rate if only one value is present
  useEffect(() => {
    if (dayRateSingle) {
      return;
    }

    if (dayRateMin && !dayRateMax) {
      setValue('dayRate', [parseFloat(dayRateMin)]);
    } else if (!dayRateMin && dayRateMax) {
      setValue('dayRate', [parseFloat(dayRateMax)]);
    }
  }, [dayRateSingle, dayRateMin, dayRateMax]);

  useEffect(() => {
    if (!dayRateSingle && !dayRateMin && !dayRateMax) {
      setValue('dayRate', [0]);
    }
  }, [dayRateSingle, dayRateMin, dayRateMax]);

  return (
    <FormField
      control={control}
      name="dayRate"
      render={() => (
        <FormItem>
          <FormLabel className="block mb-1">Day Rate (£)</FormLabel>
          <FormControl>
            <div className="flex items-center gap-x-4">
              <Input
                placeholder="Enter the day rate"
                type="number"
                value={dayRateSingle}
                onChange={(e) => handleSingleChange(e.target.value)}
                onBlur={() => {
                  // clear min and max when single input is used
                  setDayRateMin('');
                  setDayRateMax('');
                }}
              />
              <span>or</span>
              <div className="flex items-center gap-x-2">
                <Input
                  className="w-20"
                  placeholder="Min"
                  type="number"
                  value={dayRateMin}
                  onChange={(e) => handleRangeChange('min', e.target.value)}
                  onBlur={() => {
                    // clear single rate when range is used
                    setDayRateSingle('');
                  }}
                />
                <span>-</span>
                <Input
                  className="w-20"
                  placeholder="Max"
                  type="number"
                  value={dayRateMax}
                  onChange={(e) => handleRangeChange('max', e.target.value)}
                  onBlur={() => {
                    // clear single rate when range is used
                    setDayRateSingle('');
                  }}
                />
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DayRateInputs;
