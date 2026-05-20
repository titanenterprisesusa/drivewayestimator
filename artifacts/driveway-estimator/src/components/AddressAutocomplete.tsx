import { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface Prediction {
  placeId: string;
  description: string;
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
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (input.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json() as { predictions?: Prediction[]; error?: string };
      const preds = data.predictions ?? [];
      setPredictions(preds);
      setOpen(preds.length > 0);
    } catch {
      setPredictions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 220);
  };

  const handleSelect = async (pred: Prediction) => {
    setOpen(false);
    setPredictions([]);
    onChange(pred.description); // optimistic — replaced below if details succeed

    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(pred.placeId)}`);
      const data = await res.json() as {
        components?: { longText: string; shortText: string; types: string[] }[];
      };

      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let zip = "";

      for (const c of data.components ?? []) {
        if (c.types.includes("street_number"))                    streetNumber = c.longText;
        else if (c.types.includes("route"))                       route = c.shortText;
        else if (c.types.includes("locality"))                    city = c.longText;
        else if (c.types.includes("administrative_area_level_1")) state = c.shortText;
        else if (c.types.includes("postal_code"))                 zip = c.longText;
      }

      const street = [streetNumber, route].filter(Boolean).join(" ");
      onChange(street || pred.description);
      onPlaceSelected(street, city, state, zip);
    } catch {
      // Details failed — keep the full description in street field
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "123 Main St"}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl overflow-hidden">
          {predictions.map((p) => (
            <li
              key={p.placeId}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              className="flex items-start gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground border-b border-border/40 last:border-0"
            >
              <span className="text-primary/60 mt-0.5 shrink-0 text-xs">📍</span>
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
