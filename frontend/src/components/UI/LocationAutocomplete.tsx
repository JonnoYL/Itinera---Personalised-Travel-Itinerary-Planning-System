import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { GEOAPIFY_API_KEY } from "../../lib/constants";

export type GeoPlace = {
  formatted: string;
  name?: string;
  lat: number;
  lon: number;
  category?: string;
  categories?: string[];
};

type Props = {
  label: string;
  placeholder?: string;
  input: string;
  onInputChange: (text: string) => void;
  onSelect: (place: GeoPlace) => void;
  testID?: string;
};

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function LocationAutocomplete({
  label,
  placeholder,
  input,
  onInputChange,
  onSelect,
  testID,
}: Props) {
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(input.trim(), 250);
  const latestQuery = useRef<string>("");

  useEffect(() => {
    (async () => {
      const q = debounced;
      latestQuery.current = q;
      if (!q) {
        setResults([]);
        setOpen(false);
        return;
      }
      try {
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          q,
        )}&limit=7&format=json&apiKey=${GEOAPIFY_API_KEY}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          results?: Array<{
            formatted?: string;
            name?: string;
            lat?: number;
            lon?: number;
            category?: string;
            categories?: string[];
          }>;
        };
        if (latestQuery.current !== q) return;
        const pickBest = (cats?: string[]) => {
          if (!Array.isArray(cats) || cats.length === 0) return undefined;
          const sorted = [...cats].sort((a, b) => {
            const ad = (a.match(/\./g) || []).length;
            const bd = (b.match(/\./g) || []).length;
            if (ad !== bd) return bd - ad;
            return b.length - a.length;
          });
          return sorted[0];
        };
        const parsed: GeoPlace[] =
          (data.results || [])
            .filter(
              (r) => typeof r.lat === "number" && typeof r.lon === "number",
            )
            .map((r) => ({
              formatted: r.formatted || r.name || q,
              name: r.name || r.formatted || q,
              lat: r.lat as number,
              lon: r.lon as number,
              categories: Array.isArray(r.categories) ? r.categories : [],
              category: pickBest(r.categories) || r.category || undefined,
            })) ?? [];
        setResults(parsed);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      }
    })();
  }, [debounced]);

  const showList = useMemo(() => open && results.length > 0, [open, results]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder || "Search address or place"}
        value={input}
        onChangeText={(t) => {
          onInputChange(t);
          if (!t.trim()) {
            setOpen(false);
            setResults([]);
          }
        }}
        testID={testID}
      />
      {showList && (
        <View style={styles.dropdown}>
          {results.map((r, idx) => (
            <Pressable
              key={`${r.formatted}-${r.lat}-${r.lon}-${idx}`}
              onPress={() => {
                onSelect(r);
                onInputChange(r.formatted);
                setOpen(false);
              }}
              accessibilityRole="button"
              style={styles.row}
            >
              <Text style={styles.rowTitle}>{r.name || r.formatted}</Text>
              <Text style={styles.rowMeta}>{r.formatted}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#1E1E1E",
    fontWeight: "700",
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5C9C5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DCD8",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E6E2",
  },
  rowTitle: { fontWeight: "700", color: "#1E1E1E" },
  rowMeta: { color: "#8C7F7A" },
});
