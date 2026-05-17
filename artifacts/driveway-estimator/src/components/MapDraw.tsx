import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import * as turf from "@turf/turf";

export function MapDraw({
  address,
  onAreaCalculated,
}: {
  address: string;
  onAreaCalculated: (sqFt: number, lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const geocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || map) return;

    const m = L.map(mapRef.current, { maxZoom: 22, zoomControl: true }).setView(
      [39.8283, -98.5795],
      4
    );

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxNativeZoom: 19, maxZoom: 22, attribution: "Tiles &copy; Esri" }
    ).addTo(m);

    const drawnItems = new L.FeatureGroup();
    m.addLayer(drawnItems);

    const drawControl = new (L.Control as any).Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: {
          shapeOptions: {
            color: "#C9A84C",
            fillColor: "#C9A84C",
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });
    m.addControl(drawControl);

    m.on((L as any).Draw.Event.CREATED, function (event: any) {
      drawnItems.clearLayers();
      const layer = event.layer;
      drawnItems.addLayer(layer);

      const geojson = layer.toGeoJSON();
      const areaSqMeters = turf.area(geojson);
      const areaSqFt = Math.round(areaSqMeters * 10.7639);

      const coords = geocodedCoordsRef.current;
      onAreaCalculated(areaSqFt, coords?.lat ?? 0, coords?.lng ?? 0);
    });

    setMap(m);
    return () => {
      m.remove();
    };
  }, []);

  useEffect(() => {
    if (!map || !address) return;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          geocodedCoordsRef.current = { lat, lng };
          map.setView([lat, lng], 20);
        }
      });
  }, [map, address]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px] z-0 rounded-md" />;
}
