import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = L.divIcon({
  className: '',
  iconSize: [0, 0],
    html: '<div style="transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#FF6115;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:grab"></div>',
});

export default function MapPicker({ value, onChange }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    map.current = L.map(el.current).setView(value || [16.5062, 80.648], value ? 16 : 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current);
    map.current.on('click', (e) => cb.current([e.latlng.lat, e.latlng.lng]));
    setTimeout(() => map.current && map.current.invalidateSize(), 0);
    return () => { map.current.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !value) return;
    if (marker.current) {
      marker.current.setLatLng(value);
    } else {
      marker.current = L.marker(value, { icon, draggable: true }).addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        cb.current([p.lat, p.lng]);
      });
    }
    map.current.setView(value, Math.max(map.current.getZoom(), 15));
  }, [value]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-xl border border-ink/20" />;
}