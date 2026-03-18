import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindowF, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { Hospital } from '../types';
import polyline from '@mapbox/polyline';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const mapLibraries: ('places')[] = ['places'];

interface MapComponentProps {
  patientLocation: { lat: number; lng: number; address: string };
  hospitals: Hospital[];
  assignedHospitalId?: string;
  recommendedHospitalId?: string | null;
  routes?: Record<string, { encodedPolyline?: string }>;
  arrivedAtHospital?: Hospital;
}

export function MapComponent({ patientLocation, hospitals, assignedHospitalId, recommendedHospitalId, routes, arrivedAtHospital }: MapComponentProps) {
  const center = useMemo(
    () => arrivedAtHospital
      ? { lat: arrivedAtHospital.location.lat, lng: arrivedAtHospital.location.lng }
      : { lat: patientLocation.lat, lng: patientLocation.lng },
    [patientLocation.lat, patientLocation.lng, arrivedAtHospital]
  );
  const [map, setMap] = useState<any>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: mapLibraries,
  });

  const activeHospitalId = assignedHospitalId || recommendedHospitalId;
  const activeRoute = activeHospitalId && routes?.[activeHospitalId]?.encodedPolyline;
  const assignedHospital = hospitals.find(h => h.id === assignedHospitalId);

  const routePositions: { lat: number; lng: number }[] | null = arrivedAtHospital ? null : activeRoute
    ? polyline.decode(activeRoute).map(p => ({ lat: p[0], lng: p[1] }))
    : assignedHospital
      ? [
          { lat: patientLocation.lat, lng: patientLocation.lng },
          { lat: assignedHospital.location.lat, lng: assignedHospital.location.lng }
        ]
      : null;

  useEffect(() => {
    if (!map || !isLoaded || !(window as any).google) return;

    if (arrivedAtHospital) {
      map.panTo(center);
      map.setZoom(15);
      return;
    }

    const g = (window as any).google;
    if (routePositions && routePositions.length > 1) {
      const bounds = new g.maps.LatLngBounds();
      routePositions.forEach((pos) => bounds.extend(pos));
      map.fitBounds(bounds, 60);
      return;
    }

    if (activeHospitalId) {
      const activeHospital = hospitals.find(h => h.id === activeHospitalId);
      if (activeHospital) {
        const bounds = new g.maps.LatLngBounds();
        bounds.extend(center);
        bounds.extend({ lat: activeHospital.location.lat, lng: activeHospital.location.lng });
        map.fitBounds(bounds, 60);
        return;
      }
    }

    map.panTo(center);
    map.setZoom(13);
  }, [map, isLoaded, center, hospitals, activeHospitalId, routePositions, arrivedAtHospital]);

  if (!googleMapsApiKey) {
    return (
      <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative grid place-items-center text-sm text-slate-500 bg-slate-50">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative grid place-items-center text-sm text-red-500 bg-red-50">
        No se pudo cargar Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative grid place-items-center text-sm text-slate-500 bg-slate-50">
        Cargando mapa...
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%' }}
        center={center}
        zoom={11}
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: true,
        }}
        onLoad={(instance) => setMap(instance)}
      >
        {arrivedAtHospital ? (
          <>
            <MarkerF
              position={{ lat: arrivedAtHospital.location.lat, lng: arrivedAtHospital.location.lng }}
              icon="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
              onClick={() => setSelectedMarkerId(arrivedAtHospital.id)}
            />
            {selectedMarkerId === arrivedAtHospital.id && (
              <InfoWindowF
                position={{ lat: arrivedAtHospital.location.lat, lng: arrivedAtHospital.location.lng }}
                onCloseClick={() => setSelectedMarkerId(null)}
              >
                <div>
                  <strong>{arrivedAtHospital.name}</strong>
                  <br />
                  {arrivedAtHospital.location.address}
                </div>
              </InfoWindowF>
            )}
          </>
        ) : (
          <>
        <MarkerF
          position={{ lat: patientLocation.lat, lng: patientLocation.lng }}
          icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          onClick={() => setSelectedMarkerId('patient')}
        />

        {selectedMarkerId === 'patient' && (
          <InfoWindowF
            position={{ lat: patientLocation.lat, lng: patientLocation.lng }}
            onCloseClick={() => setSelectedMarkerId(null)}
          >
            <div>
              <strong>Ambulancia (Paciente)</strong>
              <br />
              {patientLocation.address}
            </div>
          </InfoWindowF>
        )}

        {hospitals.map((hospital) => {
          const isAssigned = hospital.id === assignedHospitalId;
          const isRecommended = hospital.id === recommendedHospitalId;
          const icon = isAssigned || isRecommended
            ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';

          return (
            <MarkerF
              key={hospital.id}
              position={{ lat: hospital.location.lat, lng: hospital.location.lng }}
              icon={icon}
              onClick={() => setSelectedMarkerId(hospital.id)}
            />
          );
        })}

        {selectedMarkerId && selectedMarkerId !== 'patient' && (() => {
          const hospital = hospitals.find(h => h.id === selectedMarkerId);
          if (!hospital) return null;
          return (
            <InfoWindowF
              position={{ lat: hospital.location.lat, lng: hospital.location.lng }}
              onCloseClick={() => setSelectedMarkerId(null)}
            >
              <div>
                <strong>{hospital.name}</strong>
                <br />
                {hospital.isStrokeCenter ? 'Centro Stroke' : 'Intermedio'}
                <br />
                {hospital.location.address}
              </div>
            </InfoWindowF>
          );
        })()}

        {routePositions && (
          <PolylineF
            path={routePositions}
            options={{
              strokeColor: assignedHospitalId ? '#10b981' : '#3b82f6',
              strokeWeight: 4,
              strokeOpacity: 0.8,
              icons: activeRoute
                ? undefined
                : [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                    offset: '0',
                    repeat: '16px',
                  }],
            }}
          />
        )}
          </>
        )}
      </GoogleMap>
    </div>
  );
}
