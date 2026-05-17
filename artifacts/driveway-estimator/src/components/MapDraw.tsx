import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import * as turf from "@turf/turf";

export function MapDraw({ 
  address, 
  onAreaCalculated 
}: { 
  address: string, 
  onAreaCalculated: (sqFt: number) => void 
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || map) return;

    const m = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: 'Tiles &copy; Esri'
    }).addTo(m);

    const drawnItems = new L.FeatureGroup();
    m.addLayer(drawnItems);

    const drawControl = new (L.Control as any).Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      }
    });
    m.addControl(drawControl);

    m.on((L as any).Draw.Event.CREATED, function (event: any) {
      drawnItems.clearLayers();
      const layer = event.layer;
      drawnItems.addLayer(layer);

      const geojson = layer.toGeoJSON();
      const areaSqMeters = turf.area(geojson);
      const areaSqFt = Math.round(areaSqMeters * 10.7639);
      onAreaCalculated(areaSqFt);
    });

    setMap(m);

    return () => { m.remove(); };
  }, []);

  useEffect(() => {
    if (!map || !address) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          map.setView([parseFloat(lat), parseFloat(lon)], 20);
        }
      });
  }, [map, address]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px] z-0 rounded-md" />;
}
