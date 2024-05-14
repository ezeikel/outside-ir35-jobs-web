import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-places-autocomplete';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PostJobFormValues } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

const LocationInput = () => {
  const { control, setValue } = useFormContext<PostJobFormValues>();
  const [address, setAddress] = useState('');

  const handleSelect = async (addr: string, placeId: string) => {
    setValue('location.address', addr);
    setValue('location.placeId', placeId);
    setAddress(addr);

    try {
      const results = await geocodeByAddress(addr);
      const latLng = await getLatLng(results[0]);
      setValue('location.coordinates', latLng);
    } catch (error) {
      console.error('Error getting coordinates: ', error);
    }
  };

  return (
    <FormField
      control={control}
      name="location"
      render={() => (
        <FormItem>
          <FormLabel className="block mb-1">Location</FormLabel>
          <FormControl>
            <PlacesAutocomplete
              value={address}
              onChange={(addr) => {
                setAddress(addr);

                if (!addr) {
                  // clear all parrs of the location if the address is empty
                  setValue('location.address', '');
                  setValue('location.placeId', '');
                  setValue('location.coordinates', { lat: null, lng: null });
                }
              }}
              onSelect={handleSelect}
              searchOptions={{
                types: ['(cities)'],
                componentRestrictions: { country: ['gb'] },
              }}
            >
              {({
                getInputProps,
                suggestions,
                getSuggestionItemProps,
                loading,
              }) => {
                return (
                  <div className="relative flex flex-col gap-y-2">
                    <Input
                      // eslint-disable-next-line react/jsx-props-no-spreading
                      {...getInputProps({
                        placeholder: 'Enter the job location',
                      })}
                      // eslint-disable-next-line react/jsx-props-no-spreading
                      value={address}
                    />
                    <div>
                      {loading ? (
                        <FontAwesomeIcon
                          icon={faSpinnerThird}
                          size="2x"
                          className="bg-background-contrast-2 animate-spin self-start"
                        />
                      ) : null}
                      <div className="absolute w-full mt-1 rounded-md bg-white shadow-lg">
                        <ul
                          className={cn(
                            'max-h-60 overflow-auto text-base leading-6 rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm',
                            {
                              hidden: suggestions.length === 0,
                            },
                          )}
                        >
                          {suggestions.map((suggestion) => {
                            const { key, ...props } = getSuggestionItemProps(
                              suggestion,
                              {},
                            );

                            return (
                              <li
                                key={key}
                                className="cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                // eslint-disable-next-line react/jsx-props-no-spreading
                                {...props}
                              >
                                {suggestion.description}
                              </li>
                            );
                          })}
                          <li className="hidden gap-x-2 items-center text-[10px] bg-white p-2 [&:not(:only-child)]:flex pointer-events-none">
                            <section>
                              Places by <strong>Google</strong>
                            </section>
                            <FontAwesomeIcon
                              icon={faGoogle}
                              className="text-[#DB4437]"
                              size="lg"
                            />
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }}
            </PlacesAutocomplete>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default LocationInput;
