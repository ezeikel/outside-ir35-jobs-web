// Mapbox geocoding for the mobile location field. RN has no geocoder widget, so
// we call the Geocoding REST API directly and render our own suggestion list.
// City-level (place/locality/district), GB only — matches the web /job/post
// LocationInput exactly. The board filters on the address string (a substring
// ILIKE on location->>'address'), so the label is what search needs; we keep the
// id + coords too in case a future surface (a posted job's location) needs them.

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

export type GeoSuggestion = {
  id: string; // Mapbox stable feature id
  label: string; // full human address, e.g. "London, Greater London, England, UK"
  place: string; // primary place name only, e.g. "London" — what the board filters on
  lat: number;
  lng: number;
};

// The first comma-segment of a Mapbox label is the place itself ("London" from
// "London, Greater London, England, United Kingdom"). The board filters by a
// substring ILIKE on the stored job address (e.g. "London, UK"), so searching by
// the verbose full label would never match — we search by the primary place.
export const primaryPlace = (label: string): string =>
  label.split(",")[0]?.trim() ?? label.trim();

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

// Geocode a free-text place query → up to 5 city-level GB suggestions. Returns []
// on any failure (no token, network error, bad response) — the caller degrades to
// "type a location" with no dropdown, never an error.
export const geocodePlaces = async (
  query: string,
  signal?: AbortSignal,
): Promise<GeoSuggestion[]> => {
  const q = query.trim();
  if (!TOKEN || q.length < 2) return [];

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${TOKEN}` +
    `&types=place,locality,district` +
    `&country=gb` +
    `&autocomplete=true` +
    `&limit=5`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: MapboxFeature[] };
    return (data.features ?? []).map((f) => ({
      id: f.id,
      label: f.place_name,
      place: primaryPlace(f.place_name),
      lng: f.center[0],
      lat: f.center[1],
    }));
  } catch {
    // AbortError (superseded query) or network failure — both degrade silently.
    return [];
  }
};
