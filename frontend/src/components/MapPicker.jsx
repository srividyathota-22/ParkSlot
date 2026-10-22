import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapPicker({ value, onChange }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current).setView(value || [12.9716, 77.5946], value ? 15 : 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current);
    map.current.on('click', (e) => onChange([e.latlng.lat, e.latlng.lng]));
    setTimeout(() => map.current && map.current.invalidateSize(), 0);
    return () => { map.current.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !value) return;
    if (marker.current) marker.current.setLatLng(value);
    else marker.current = L.circleMarker(value, { radius: 9, color: '#fff', weight: 3, fillColor: '#FF6115', fillOpacity: 1 }).addTo(map.current);
  }, [value]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-xl border border-ink/20" />;
}