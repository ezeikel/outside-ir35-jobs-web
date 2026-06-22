'use client';

import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PostJobFormValues } from '@/types';

// Location autocomplete via Mapbox (replaces Google Places — which dragged in a
// window.google global that raced on load and crashed the whole /job/post page,
// and required a heavier script). The geocoder is self-contained: no global to
// wait on. Public token (NEXT_PUBLIC_) so it's available client-side. UK-only,
// city-level (place/locality/district). If the token is missing it falls back to
// a plain text input so the form still works and never crashes.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// What we persist: the form's location is { address, placeId, coordinates }.
// Mapbox has no "placeId" — we store its stable feature id there.
type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

const LocationInput = () => {
  const { control, setValue } = useFormContext<PostJobFormValues>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || initialized.current) {
      return undefined;
    }

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      // City-level: a job listing's location is a town/city, not a street.
      types: 'place,locality,district',
      countries: 'gb',
      autocomplete: true,
      placeholder: 'Enter the job location',
    });
    geocoderRef.current = geocoder;
    geocoder.addTo(containerRef.current);

    geocoder.on('result', (e: { result: MapboxFeature }) => {
      const { id, place_name, center } = e.result;
      setValue('location.address', place_name);
      setValue('location.placeId', id);
      setValue('location.coordinates', { lat: center[1], lng: center[0] });
    });

    // Clearing the input clears the stored location.
    geocoder.on('clear', () => {
      setValue('location.address', '');
      setValue('location.placeId', '');
      setValue('location.coordinates', { lat: null, lng: null });
    });

    // Match the geocoder box to the form's input styling.
    const el = containerRef.current.querySelector(
      '.mapboxgl-ctrl-geocoder',
    ) as HTMLElement | null;
    if (el) {
      el.style.width = '100%';
      el.style.maxWidth = 'none';
      el.style.boxShadow = 'none';
    }

    initialized.current = true;

    return () => {
      geocoderRef.current?.onRemove();
      geocoderRef.current = null;
      initialized.current = false;
    };
  }, [setValue]);

  return (
    <FormField
      control={control}
      name="location"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="block mb-1">Location</FormLabel>
          <FormControl>
            {MAPBOX_TOKEN ? (
              <div ref={containerRef} className="oir35-geocoder" />
            ) : (
              // No token — plain input so the form still works and never crashes.
              <Input
                placeholder="Enter the job location"
                onChange={(e) => setValue('location.address', e.target.value)}
                value={field.value?.address ?? ''}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default LocationInput;
