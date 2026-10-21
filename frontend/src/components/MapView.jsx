import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (price, active) =>
  L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-50%);white-space:nowrap;font:700 13px 'DM Sans',sans-serif;padding:5px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;background:${active ? '#1A100A' : '#FF6115'};color:${active ? '#FF6115' : '#1A100A'}">₹${price}</div>`,
  });

const latlng = (l) => [l.location.coordinates[1], l.location.coordinates[0]];

export default function MapView({ center, listings, selectedId, onSelect }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current).setView(center, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    setTimeout(() => map.current && map.current.invalidateSize(), 0);
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const pts = [center, ...listings.map(latlng)];
    map.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 });
  }, [center, listings]);
  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    L.circleMarker(center, { radius: 8, color: '#fff', weight: 3, fillColor: '#1A100A', fillOpacity: 1 })
      .bindTooltip('Your destination')
      .addTo(layer.current);
    listings.forEach((l) => {
      const active = l._id === selectedId;
      L.marker(latlng(l), { icon: pin(l.priceForRequestedDuration, active), zIndexOffset: active ? 1000 : 0 })
        .on('click', () => onSelect(l._id))
        .addTo(layer.current);
    });
  }, [center, listings, selectedId, onSelect]);

  useEffect(() => {
    const l = listings.find((x) => x._id === selectedId);
    if (l && map.current) map.current.panTo(latlng(l));
  }, [selectedId, listings]);

  return <div ref={el} className="absolute inset-0" />;
}