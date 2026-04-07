'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MemberPin {
  id: number;
  first_name: string;
  last_name: string;
  latitude: number;
  longitude: number;
  house_church_name: string | null;
}

// Color map for house churches
const HC_COLORS = [
  '#00C853', '#2979FF', '#FF9800', '#E91E63', '#9C27B0',
  '#00BCD4', '#FF5722', '#4CAF50', '#3F51B5', '#FFC107',
];

function getColor(name: string | null, colorMap: Map<string, string>): string {
  if (!name) return '#8E99A4';
  if (colorMap.has(name)) return colorMap.get(name)!;
  const idx = colorMap.size % HC_COLORS.length;
  colorMap.set(name, HC_COLORS[idx]);
  return HC_COLORS[idx];
}

function createIcon(color: string) {
  return L.divIcon({
    className: 'member-map-pin',
    html: `<div style="
      width: 12px; height: 12px; border-radius: 50%;
      background: ${color}; border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function MemberMap({ members }: { members: MemberPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || members.length === 0) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const colorMap = new Map<string, string>();
    const bounds = L.latLngBounds([]);

    for (const member of members) {
      const color = getColor(member.house_church_name, colorMap);
      const marker = L.marker([member.latitude, member.longitude], {
        icon: createIcon(color),
      }).addTo(map);

      marker.bindPopup(
        `<strong>${member.first_name} ${member.last_name}</strong>` +
        (member.house_church_name ? `<br/><span style="color:${color}">${member.house_church_name}</span>` : '')
      );

      bounds.extend([member.latitude, member.longitude]);
    }

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [members]);

  if (members.length === 0) return null;

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}
    />
  );
}
