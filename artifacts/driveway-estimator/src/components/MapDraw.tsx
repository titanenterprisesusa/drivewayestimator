import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let _initialized = false;

async function initMaps(apiKey: string) {
  if (!_initialized) {
    setOptions({ apiKey, version: "weekly" });
    _initialized = true;
  }
}

export function MapDraw({
  address,
  onAreaCalculated,
}: {
  address: string;
  onAreaCalculated: (sqFt: number, lat: number, lng: number) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const onAreaRef = useRef(onAreaCalculated);
  onAreaRef.current = onAreaCalculated;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Fetch API key from server
        const res = await fetch("/api/config");
        const data = await res.json();
        const apiKey: string = data.googleMapsApiKey ?? "";
        if (!apiKey) throw new Error("No API key returned from server.");

        await initMaps(apiKey);

        // Import required libraries
        const mapsLib = await importLibrary("maps") as google.maps.MapsLibrary;
        const drawingLib = await importLibrary("drawing") as google.maps.DrawingLibrary;
        const geometryLib = await importLibrary("geometry") as google.maps.GeometryLibrary;
        const geocodingLib = await importLibrary("geocoding") as google.maps.GeocodingLibrary;

        if (cancelled || !mapDivRef.current) return;

        const map = new mapsLib.Map(mapDivRef.current, {
          center: { lat: 41.7065, lng: -71.4538 },
          zoom: 18,
          mapTypeId: "satellite",
          tilt: 0,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;
        geocoderRef.current = new geocodingLib.Geocoder();

        const drawingManager = new drawingLib.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.POLYGON,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.POLYGON],
          },
          polygonOptions: {
            fillColor: "#C9A84C",
            fillOpacity: 0.25,
            strokeColor: "#C9A84C",
            strokeWeight: 2,
            editable: true,
            draggable: true,
          },
        });
        drawingManager.setMap(map);

        google.maps.event.addListener(
          drawingManager,
          "polygoncomplete",
          (polygon: google.maps.Polygon) => {
            if (polygonRef.current) polygonRef.current.setMap(null);
            polygonRef.current = polygon;
            drawingManager.setDrawingMode(null);

            const compute = () => {
              const path = polygon.getPath();
              const area = geometryLib.spherical.computeArea(path);
              const sqFt = Math.round(area * 10.7639);
              const pts = path.getArray();
              const lat = pts.reduce((s, p) => s + p.lat(), 0) / pts.length;
              const lng = pts.reduce((s, p) => s + p.lng(), 0) / pts.length;
              onAreaRef.current(sqFt, lat, lng);
            };

            compute();
            google.maps.event.addListener(polygon.getPath(), "set_at", compute);
            google.maps.event.addListener(polygon.getPath(), "insert_at", compute);
            google.maps.event.addListener(polygon.getPath(), "remove_at", compute);
          }
        );

        if (!cancelled) setStatus("ready");
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Google Maps load error:", msg);
          setErrorMsg(
            `Maps failed to load: ${msg}. ` +
              "Ensure the Maps JavaScript API is enabled in Google Cloud Console and billing is active."
          );
          setStatus("error");
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Geocode and pan to address once map is ready
  useEffect(() => {
    if (status !== "ready" || !geocoderRef.current || !mapRef.current || !address) return;
    geocoderRef.current.geocode({ address }, (results, gStatus) => {
      if (gStatus === "OK" && results?.[0]) {
        mapRef.current!.panTo(results[0].geometry.location);
        mapRef.current!.setZoom(20);
      }
    });
  }, [address, status]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapDivRef} className="w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-md">
          <p className="text-muted-foreground text-sm">Loading map…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-md px-6">
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
