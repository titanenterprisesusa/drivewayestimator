import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, fetchMapsApiKey } from "@/lib/maps";
import { apiUrl } from "@/lib/api-base";

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

  const verticesRef = useRef<google.maps.LatLng[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const isClosedRef = useRef(false);
  const firstMarkerRef = useRef<google.maps.Marker | null>(null);

  const onAreaRef = useRef(onAreaCalculated);
  onAreaRef.current = onAreaCalculated;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [vertexCount, setVertexCount] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  const computeAndReport = (
    pts: google.maps.LatLng[] | google.maps.MVCArray<google.maps.LatLng>
  ) => {
    const arr = Array.isArray(pts) ? pts : pts.getArray();
    if (arr.length < 3) return;
    const area = google.maps.geometry.spherical.computeArea(arr);
    const sqFt = Math.round(area * 10.7639);
    const lat = arr.reduce((s, p) => s + p.lat(), 0) / arr.length;
    const lng = arr.reduce((s, p) => s + p.lng(), 0) / arr.length;
    onAreaRef.current(sqFt, lat, lng);
  };

  const closePolygon = () => {
    const verts = verticesRef.current;
    if (verts.length < 3) return;

    markersRef.current.forEach((m) => m.setMap(null));
    linesRef.current.forEach((l) => l.setMap(null));
    markersRef.current = [];
    linesRef.current = [];

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
    if (polygonRef.current) polygonRef.current.setMap(null);
    markersRef.current = [];
    linesRef.current = [];
    polygonRef.current = null;
    firstMarkerRef.current = null;
    isClosedRef.current = false;
    setIsClosed(false);
    setVertexCount(0);
    onAreaRef.current(0, 0, 0);
  };

  // Update first marker icon to show it's clickable when ≥3 points placed
  const updateFirstMarkerIcon = (count: number) => {
    const fm = firstMarkerRef.current;
    if (!fm) return;
    if (count >= 3) {
      fm.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeColor: "#C9A84C",
        strokeWeight: 3,
      });
      fm.setTitle("Click to close shape");
      (fm as any).setOptions({ cursor: "pointer" });
    } else {
      fm.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#C9A84C",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
      fm.setTitle("");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await fetch(apiUrl("/api/config"));
        const data = await res.json();
        const apiKey: string = data.googleMapsApiKey ?? "";
        if (!apiKey) throw new Error("No API key returned from server.");

        await loadGoogleMapsScript(apiKey);
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

          const isFirst = verts.length === 0;
          const marker = new google.maps.Marker({
            position: pt,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: isFirst ? 8 : 6,
              fillColor: "#C9A84C",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 10,
          });

          if (isFirst) {
            firstMarkerRef.current = marker;
            marker.addListener("click", () => {
              if (!isClosedRef.current && verticesRef.current.length >= 3) {
                closePolygon();
              }
            });
          }

          markersRef.current.push(marker);

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
          const newCount = verts.length;
          setVertexCount(newCount);
          updateFirstMarkerIcon(newCount);
        });

        if (!cancelled) setStatus("ready");
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Google Maps load error:", msg);
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

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

      {status === "ready" && !isClosed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-2 rounded-full pointer-events-none text-center whitespace-nowrap">
          {vertexCount === 0
            ? "Click to start drawing your driveway outline"
            : vertexCount < 3
            ? `${vertexCount} point${vertexCount > 1 ? "s" : ""} placed — keep clicking`
            : "Keep clicking to add points — tap Close Shape when done"}
        </div>
      )}

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
