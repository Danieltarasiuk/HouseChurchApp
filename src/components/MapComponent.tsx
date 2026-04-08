'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Re-export from map-utils so existing dynamic imports still work
export { getHCColor, HC_PALETTE } from '@/lib/map-utils';
export type { MapMarker } from '@/lib/map-utils';

import type { MapMarker } from '@/lib/map-utils';

const HOUSE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="white" stroke="white" stroke-width="0.5"><path d="M3 12l9-9 9 9M5 11v8a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-8"/></svg>`;

function createHCIcon(color: string) {
  return L.divIcon({
    className: 'map-pin-hc',
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    ">${HOUSE_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

interface MapComponentProps {
  markers: MapMarker[];
  height: string;
  className?: string;
  emptyMessage?: string;
}

export default function MapComponent({ markers, height, className, emptyMessage }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const validMarkers = markers.filter(m => m.lat && m.lng);

    if (validMarkers.length === 0) {
      // Clean up any existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

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

    const bounds = L.latLngBounds([]);

    // Add HC markers first (so they appear on top)
    for (const m of validMarkers.filter(x => x.type === 'house_church')) {
      const marker = L.marker([m.lat, m.lng], { icon: createHCIcon(m.color), zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(m.tooltipHtml, { maxWidth: 200 });
      bounds.extend([m.lat, m.lng]);
    }

    // Add member markers
    for (const m of validMarkers.filter(x => x.type === 'member')) {
      const circle = L.circleMarker([m.lat, m.lng], {
        radius: 8,
        fillColor: m.color,
        fillOpacity: 0.9,
        color: '#fff',
        weight: 2,
      }).addTo(map);
      circle.bindPopup(m.tooltipHtml, { maxWidth: 200 });
      bounds.extend([m.lat, m.lng]);
    }

    map.fitBounds(bounds, { padding: [40, 40] });
    // Cap max zoom for single pin
    map.whenReady(() => {
      if (map.getZoom() > 16) map.setZoom(16);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers]);

  const validMarkers = markers.filter(m => m.lat && m.lng);

  if (validMarkers.length === 0) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        {emptyMessage || 'No location data available.'}
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={className}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}
    />
  );
}
