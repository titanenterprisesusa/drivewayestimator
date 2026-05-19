import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface Prediction {
  description: string;
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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const readyRef = useRef(false);

  // Wait for the new Places API to be available
  useEffect(() => {
    const check = () => {
      if (window.google?.maps?.places?.AutocompleteSuggestion) {
        readyRef.current = true;
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        return true;
      }
      return false;
    };
    if (!check()) {
      const interval = setInterval(() => { if (check()) clearInterval(interval); }, 150);
      return () => clearInterval(interval);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!readyRef.current || input.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    try {
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ["us"],
        sessionToken: sessionTokenRef.current ?? undefined,
      });
      const preds: Prediction[] = (suggestions ?? [])
        .filter((s) => s.placePrediction)
        .map((s) => ({
          description: s.placePrediction!.text.toString(),
          placePrediction: s.placePrediction!,
        }));
      setPredictions(preds);
      setOpen(preds.length > 0);
    } catch {
      setPredictions([]);
      setOpen(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 250);
  };

  const handleSelect = async (pred: Prediction) => {
    setOpen(false);
    setPredictions([]);
    onChange(pred.description);

    try {
      const place = pred.placePrediction.toPlace();
      await place.fetchFields({ fields: ["addressComponents"] });

      // Reset session token after a selection
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let zip = "";

      for (const component of place.addressComponents ?? []) {
        const types = component.types;
        if (types.includes("street_number")) streetNumber = component.longText ?? "";
        else if (types.includes("route")) route = component.shortText ?? "";
        else if (types.includes("locality")) city = component.longText ?? "";
        else if (types.includes("administrative_area_level_1")) state = component.shortText ?? "";
        else if (types.includes("postal_code")) zip = component.longText ?? "";
      }

      const street = [streetNumber, route].filter(Boolean).join(" ");
      onChange(street);
      onPlaceSelected(street, city, state, zip);
    } catch {
      // If details fail, leave the description as-is
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        data-testid="input-street"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "123 Main St"}
        autoComplete="off"
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
          {predictions.map((p, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground border-b border-border/50 last:border-0"
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
