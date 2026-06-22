import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
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
import cn from '@/utils/cn';

// react-places-autocomplete THROWS synchronously on init if window.google.maps
// isn't loaded — and the Maps script is loaded lazily (strategy=lazyOnload), so on
// first render it usually isn't there yet, crashing the whole /job/post page. Poll
// for the Places library and only mount PlacesAutocomplete once it's ready; until
// then (or if Maps never loads — missing/invalid key) fall back to a plain text
// input so the form still works and the page never crashes.
const useGoogleMapsReady = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const isLoaded = () =>
      typeof window !== 'undefined' && !!window.google?.maps?.places;
    if (isLoaded()) {
      setReady(true);
      return undefined;
    }
    const interval = setInterval(() => {
      if (isLoaded()) {
        setReady(true);
        clearInterval(interval);
      }
    }, 300);
    // Give up polling after ~15s; the plain-input fallback stays usable.
    const timeout = setTimeout(() => clearInterval(interval), 15_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
};

const LocationInput = () => {
  const { control, setValue } = useFormContext<PostJobFormValues>();
  const [address, setAddress] = useState('');
  const mapsReady = useGoogleMapsReady();

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
            {!mapsReady ? (
              // Maps not loaded (yet, or unavailable) — plain input so the form
              // still works and the page never crashes. Still records the typed
              // address; coordinates/placeId just stay empty.
              <Input
                placeholder="Enter the job location"
                value={address}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddress(v);
                  setValue('location.address', v);
                }}
              />
            ) : (
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
                }) => (
                  <div className="relative flex flex-col gap-y-2">
                    <Input
                      {...getInputProps({
                        placeholder: 'Enter the job location',
                      })}
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
                      <div className="absolute w-full mt-1 rounded-md border border-border bg-popover shadow-lg">
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
                )}
              </PlacesAutocomplete>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default LocationInput;
