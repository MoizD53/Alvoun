'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's missing icon issue in Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SalesmanLocation {
  id: string;
  name: string;
  status: 'Live' | 'Stale' | 'Offline';
  lat?: number;
  lng?: number;
  accuracy?: number;
  lastUpdated?: string;
  ageText: string;
}

// Component to automatically fit bounds to markers
function FitBounds({ salesmen }: { salesmen: SalesmanLocation[] }) {
  const map = useMap();

  useEffect(() => {
    const activeLocations = salesmen.filter(s => s.lat && s.lng);
    if (activeLocations.length === 0) return;

    if (activeLocations.length === 1) {
      const loc = activeLocations[0];
      map.setView([loc.lat!, loc.lng!], 14);
    } else {
      const bounds = L.latLngBounds(activeLocations.map(s => [s.lat!, s.lng!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, salesmen]);

  return null;
}

export default function LeafletMap({ salesmen }: { salesmen: SalesmanLocation[] }) {
  // Default center if no active salesmen (center of India)
  const defaultCenter: L.LatLngExpression = [20.5937, 78.9629];
  const defaultZoom = 5;

  return (
    <div className="w-full h-[450px] lg:h-[600px] rounded-2xl overflow-hidden border border-border-subtle shadow-inset-sm relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {salesmen.filter(s => s.lat && s.lng).map((salesman) => (
          <Marker key={salesman.id} position={[salesman.lat!, salesman.lng!]}>
            <Popup>
              <div className="text-sm p-1 font-sans">
                <strong className="block text-base font-black text-slate-900 mb-1">{salesman.name}</strong>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="font-bold text-slate-600">Status:</span>
                  <span className={`${
                    salesman.status === 'Live' ? 'text-emerald-600' :
                    salesman.status === 'Stale' ? 'text-amber-600' :
                    'text-slate-400'
                  } font-black`}>{salesman.status}</span>
                  
                  <span className="font-bold text-slate-600">Last Seen:</span>
                  <span className="font-semibold text-slate-800">{salesman.lastUpdated || 'Never'}</span>
                  
                  <span className="font-bold text-slate-600">Age:</span>
                  <span className="text-slate-700">{salesman.ageText}</span>
                  
                  <span className="font-bold text-slate-600">Coords:</span>
                  <span className="text-slate-700 font-mono text-[11px]">{salesman.lat?.toFixed(4)}, {salesman.lng?.toFixed(4)}</span>
                  
                  <span className="font-bold text-slate-600">Accuracy:</span>
                  <span className="text-slate-700">{salesman.accuracy ? `${Math.round(salesman.accuracy)}m` : 'N/A'}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <FitBounds salesmen={salesmen} />
      </MapContainer>
    </div>
  );
}
