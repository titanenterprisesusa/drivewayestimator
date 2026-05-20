import { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface Suggestion {
  label: string;
  placePrediction: google.maps.places.PlacePrediction;
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (street: string, city: string, state: string, zip: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ id, value, onChange, onPlaceSelected, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refresh session token (billing optimization — groups autocomplete + details into one billable session)
  const newToken = () => {
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      tokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const api = window.google?.maps?.places?.AutocompleteSuggestion;
    if (!api) return;

    if (!tokenRef.current) newToken();

    setLoading(true);
    try {
      const { suggestions: raw } = await api.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ["us"],
        sessionToken: tokenRef.current ?? undefined,
      } as google.maps.places.AutocompleteSuggestionRequest);

      const results: Suggestion[] = (raw ?? [])
        .filter((s) => s.placePrediction)
        .map((s) => {
          const pp = s.placePrediction!;
          // text.text gives the full formatted address string
          const label = pp.text?.text ?? pp.mainText?.text ?? "";
          return { label, placePrediction: pp };
        });

      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const handleSelect = async (item: Suggestion) => {
    setOpen(false);
    setSuggestions([]);

    try {
      const place = item.placePrediction.toPlace();
      await place.fetchFields({ fields: ["addressComponents"] });
      // After a selection the session is complete — refresh token for next search
      newToken();

      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let zip = "";

      for (const c of place.addressComponents ?? []) {
        const types = c.types ?? [];
        if (types.includes("street_number")) streetNumber = c.longText ?? "";
        else if (types.includes("route")) route = c.shortText ?? "";
        else if (types.includes("locality")) city = c.longText ?? "";
        else if (types.includes("administrative_area_level_1")) state = c.shortText ?? "";
        else if (types.includes("postal_code")) zip = c.longText ?? "";
      }

      const street = [streetNumber, route].filter(Boolean).join(" ");
      onChange(street);
      onPlaceSelected(street, city, state, zip);
    } catch {
      // Fallback: put the full label into street field
      onChange(item.label);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        data-testid="input-street"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "123 Main St"}
        autoComplete="off"
      />
      {loading && value.length >= 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="flex items-start gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground border-b border-border/40 last:border-0"
            >
              <span className="text-primary/60 mt-0.5 shrink-0 text-xs">📍</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
