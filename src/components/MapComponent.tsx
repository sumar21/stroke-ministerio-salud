import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital } from '../types';
import polyline from '@mapbox/polyline';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const assignedHospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  patientLocation: { lat: number; lng: number; address: string };
  hospitals: Hospital[];
  assignedHospitalId?: string;
  recommendedHospitalId?: string | null;
  routes?: Record<string, { encodedPolyline?: string }>;
}

// Auto-fits the map to show the patient + the active/selected hospital
function BoundsFitter({
  patientLocation,
  hospitals,
  activeHospitalId,
  routePositions,
}: {
  patientLocation: { lat: number; lng: number };
  hospitals: Hospital[];
  activeHospitalId?: string | null;
  routePositions: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routePositions && routePositions.length > 1) {
      // Fit to the route polyline
      const bounds = L.latLngBounds(routePositions);
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 0.8 });
    } else if (activeHospitalId) {
      // Fit just between patient and the active hospital
      const activeHospital = hospitals.find(h => h.id === activeHospitalId);
      if (activeHospital) {
        const bounds = L.latLngBounds([
          [patientLocation.lat, patientLocation.lng],
          [activeHospital.location.lat, activeHospital.location.lng],
        ]);
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 0.8 });
      }
    } else {
      // No hospital selected: center on patient
      map.flyTo([patientLocation.lat, patientLocation.lng], 13, { duration: 0.8 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHospitalId, patientLocation.lat, patientLocation.lng]);

  return null;
}

export function MapComponent({ patientLocation, hospitals, assignedHospitalId, recommendedHospitalId, routes }: MapComponentProps) {
  const center: [number, number] = [patientLocation.lat, patientLocation.lng];

  const activeHospitalId = assignedHospitalId || recommendedHospitalId;
  const activeRoute = activeHospitalId && routes?.[activeHospitalId]?.encodedPolyline;
  const assignedHospital = hospitals.find(h => h.id === assignedHospitalId);

  const routePositions: [number, number][] | null = activeRoute
    ? polyline.decode(activeRoute).map(p => [p[0], p[1]] as [number, number])
    : assignedHospital
      ? [
          [patientLocation.lat, patientLocation.lng] as [number, number],
          [assignedHospital.location.lat, assignedHospital.location.lng] as [number, number]
        ]
      : null;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
      <MapContainer center={center} zoom={11} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <BoundsFitter
          patientLocation={patientLocation}
          hospitals={hospitals}
          activeHospitalId={activeHospitalId}
          routePositions={routePositions}
        />

        {/* Patient / Ambulance Marker */}
        <Marker position={[patientLocation.lat, patientLocation.lng]} icon={ambulanceIcon}>
          <Popup>
            <strong>Ambulancia (Paciente)</strong><br/>
            {patientLocation.address}
          </Popup>
        </Marker>

        {/* Hospital Markers */}
        {hospitals.map(hospital => {
          const isAssigned = hospital.id === assignedHospitalId;
          const isRecommended = hospital.id === recommendedHospitalId;
          return (
            <Marker
              key={hospital.id}
              position={[hospital.location.lat, hospital.location.lng]}
              icon={isAssigned || isRecommended ? assignedHospitalIcon : hospitalIcon}
            >
              <Popup>
                <strong>{hospital.name}</strong><br/>
                {hospital.isStrokeCenter ? 'Centro Stroke' : 'Hospital General'}<br/>
                {hospital.location.address}
              </Popup>
            </Marker>
          );
        })}

        {/* Route Line */}
        {routePositions && (
          <Polyline
            positions={routePositions}
            color={assignedHospitalId ? "#10b981" : "#3b82f6"}
            weight={4}
            dashArray={activeRoute ? undefined : "8, 8"}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}
