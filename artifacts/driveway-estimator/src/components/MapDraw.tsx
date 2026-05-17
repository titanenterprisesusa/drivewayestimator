import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let _mapsReady = false;
let _apiKeySet = false;

async function ensureMapsLoaded(apiKey: string) {
  if (!_apiKeySet) {
    setOptions({ apiKey, version: "weekly" });
    _apiKeySet = true;
  }
  if (!_mapsReady) {
    await importLibrary("maps");
    await importLibrary("geometry");
    await importLibrary("geocoding");
    _mapsReady = true;
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

  // Drawing state — all stored in refs to avoid stale closures
  const verticesRef = useRef<google.maps.LatLng[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const previewLineRef = useRef<google.maps.Polyline | null>(null);
  const isClosedRef = useRef(false);

  const onAreaRef = useRef(onAreaCalculated);
  onAreaRef.current = onAreaCalculated;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [vertexCount, setVertexCount] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  const computeAndReport = (path: google.maps.MVCArray<google.maps.LatLng> | google.maps.LatLng[]) => {
    const pts = Array.isArray(path) ? path : path.getArray();
    if (pts.length < 3) return;
    const area = google.maps.geometry.spherical.computeArea(pts);
    const sqFt = Math.round(area * 10.7639);
    const lat = pts.reduce((s, p) => s + p.lat(), 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng(), 0) / pts.length;
    onAreaRef.current(sqFt, lat, lng);
  };

  const closePolygon = () => {
    const verts = verticesRef.current;
    if (verts.length < 3) return;

    // Remove markers and lines
    markersRef.current.forEach((m) => m.setMap(null));
    linesRef.current.forEach((l) => l.setMap(null));
    if (previewLineRef.current) previewLineRef.current.setMap(null);
    markersRef.current = [];
    linesRef.current = [];

    // Draw editable polygon
    if (polygonRef.current) polygonRef.current.setMap(null);
    const polygon = new google.maps.Polygon({
      paths: verts,
      map: mapRef.current,
      fillColor: "#C9A84C",
      fillOpacity: 0.25,
      strokeColor: "#C9A84C",
      strokeWeight: 2,
      editable: true,
      draggable: true,
    });
    polygonRef.current = polygon;
    isClosedRef.current = true;
    setIsClosed(true);

    computeAndReport(verts);

    const path = polygon.getPath();
    path.addListener("set_at", () => computeAndReport(path));
    path.addListener("insert_at", () => computeAndReport(path));
    path.addListener("remove_at", () => computeAndReport(path));
  };

  const resetDraw = () => {
    verticesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    linesRef.current.forEach((l) => l.setMap(null));
    if (previewLineRef.current) previewLineRef.current.setMap(null);
    if (polygonRef.current) polygonRef.current.setMap(null);
    markersRef.current = [];
    linesRef.current = [];
    polygonRef.current = null;
    isClosedRef.current = false;
    setIsClosed(false);
    setVertexCount(0);
    onAreaRef.current(0, 0, 0);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        const apiKey: string = data.googleMapsApiKey ?? "";
        if (!apiKey) throw new Error("No API key returned from server.");

        await ensureMapsLoaded(apiKey);
        if (cancelled || !mapDivRef.current) return;

        const map = new google.maps.Map(mapDivRef.current, {
          center: { lat: 41.7065, lng: -71.4538 },
          zoom: 18,
          mapTypeId: "satellite",
          tilt: 0,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          draggableCursor: "crosshair",
        });
        mapRef.current = map;
        geocoderRef.current = new google.maps.Geocoder();

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (isClosedRef.current || !e.latLng) return;

          const verts = verticesRef.current;
          const pt = e.latLng;

          // Auto-close if clicking near the first vertex (3+ verts already)
          if (verts.length >= 3) {
            const dist = google.maps.geometry.spherical.computeDistanceBetween(pt, verts[0]);
            if (dist < 8) {
              closePolygon();
              return;
            }
          }

          // Add vertex marker
          const marker = new google.maps.Marker({
            position: pt,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: verts.length === 0 ? 8 : 6,
              fillColor: "#C9A84C",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 10,
          });
          markersRef.current.push(marker);

          // Draw line from last vertex
          if (verts.length >= 1) {
            const line = new google.maps.Polyline({
              path: [verts[verts.length - 1], pt],
              map,
              strokeColor: "#C9A84C",
              strokeWeight: 2,
              strokeOpacity: 0.9,
            });
            linesRef.current.push(line);
          }

          verts.push(pt);
          verticesRef.current = verts;
          setVertexCount(verts.length);
        });

        if (!cancelled) setStatus("ready");
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Google Maps error:", msg);
          setErrorMsg(`Map failed to load: ${msg}`);
          setStatus("error");
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Geocode address when map is ready
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

      {/* Drawing instructions overlay */}
      {status === "ready" && !isClosed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-2 rounded-full pointer-events-none text-center whitespace-nowrap">
          {vertexCount === 0
            ? "Click to start drawing your driveway outline"
            : vertexCount < 3
            ? `${vertexCount} point${vertexCount > 1 ? "s" : ""} placed — keep clicking to trace the shape`
            : "Click near the first point to close, or keep adding points"}
        </div>
      )}

      {/* Buttons */}
      {status === "ready" && (
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {!isClosed && vertexCount >= 3 && (
            <button
              onClick={closePolygon}
              className="bg-primary text-black text-xs font-bold px-3 py-1.5 rounded shadow"
            >
              Close Shape
            </button>
          )}
          {(isClosed || vertexCount > 0) && (
            <button
              onClick={resetDraw}
              className="bg-black/70 text-white text-xs px-3 py-1.5 rounded shadow border border-white/20"
            >
              Clear & Redraw
            </button>
          )}
        </div>
      )}

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
