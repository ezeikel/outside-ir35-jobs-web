import { faLocationDot, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { geocodePlaces, type GeoSuggestion } from "@/lib/api-mapbox";

// Location input with Mapbox city-level suggestions (GB). Debounced so we don't
// fire a geocode per keystroke; an AbortController cancels the superseded request.
// Picking a suggestion (or submitting) commits the address string — the board
// filters on it. Degrades to a plain text field if Mapbox is unreachable.

const LocationField = ({
  value,
  onChangeText,
  onSubmit,
  onPick,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  // Picking a suggestion commits the search immediately (we have the final
  // value), unlike typing where we wait for the search key. Passes the chosen
  // label so the parent can commit with the right location in the same tick.
  onPick: (label: string) => void;
}) => {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced geocode while the field is focused and has 2+ chars.
  useEffect(() => {
    if (!focused || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      geocodePlaces(value, controller.signal).then(setSuggestions);
    }, 250);
    return () => clearTimeout(handle);
  }, [value, focused]);

  const pick = (s: GeoSuggestion) => {
    // Use the primary place ("London"), not the verbose label, so it matches the
    // stored job addresses — and what you see equals what's searched.
    onChangeText(s.place);
    setSuggestions([]);
    setFocused(false);
    onPick(s.place);
  };

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View>
      <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
        <FontAwesomeIcon icon={faLocationDot} size={15} color="#a3a09e" />
        <TextInput
          className="ml-2 flex-1 py-3 text-base text-foreground"
          placeholder="Location (any)"
          placeholderTextColor="#a3a09e"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => {
            setSuggestions([]);
            onSubmit();
          }}
          returnKeyType="search"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {value.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              onChangeText("");
              setSuggestions([]);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear location"
          >
            <FontAwesomeIcon icon={faXmark} size={15} color="#a3a09e" />
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <View className="mt-1 overflow-hidden rounded-lg border border-border bg-card">
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              className={`px-3 py-3 active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
              onPress={() => pick(s)}
              accessibilityRole="button"
              accessibilityLabel={s.label}
            >
              <Text className="text-sm text-foreground" numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default LocationField;
