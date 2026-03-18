
export interface RouteMetrics {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  encodedPolyline?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

type MapsAction = 'geocode-place-id' | 'geocode-address' | 'reverse-geocode' | 'route' | 'autocomplete';

async function callMapsApi(action: MapsAction, payload: Record<string, unknown>) {
  const response = await fetch('/api/maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Error en el servicio de mapas');
  }

  return data;
}

// Obtiene sugerencias mientras el usuario escribe, priorizando Argentina y la cercanía (si hay lat/lng)
export async function getAddressSuggestions(
  input: string,
  currentLat?: number,
  currentLng?: number
): Promise<PlaceSuggestion[]> {
  if (!input || input.length < 3) return [];

  try {
    const payload: Record<string, unknown> = { input };
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      payload.lat = currentLat;
      payload.lng = currentLng;
    }

    const data = await callMapsApi('autocomplete', payload);

    if (data.status === 'OK' && data.predictions) {
      return data.predictions.map((p: any) => ({
        description: p.description,
        placeId: p.place_id,
      }));
    }

    return [];
  } catch (error) {
    console.error('Autocomplete Error:', error);
    return [];
  }
}

async function reverseGeocodeClientFallback(lat: number, lng: number): Promise<string> {
  const g = (window as any).google;
  if (!g?.maps?.Geocoder) throw new Error('Google Geocoder not available');

  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: any) => {
      if (status === g.maps.GeocoderStatus.OK && results?.length) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Client reverse geocode failed: ${status}`));
      }
    });
  });
}

export async function geocodePlaceId(placeId: string): Promise<GeocodeResult> {
  try {
    const data = await callMapsApi('geocode-place-id', { placeId });

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: data.results[0].formatted_address
      };
    } else {
      console.error("Geocoding by place_id failed:", data);
      throw new Error(data.error_message || 'Place not found');
    }
  } catch (error) {
    console.error("Geocoding Error:", error);
    throw error;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const data = await callMapsApi('geocode-address', { address });

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: data.results[0].formatted_address
      };
    } else {
      console.error("Geocoding failed:", data);
      throw new Error(data.error_message || 'Address not found');
    }
  } catch (error) {
    console.error("Geocoding Error:", error);
    throw error;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const data = await callMapsApi('reverse-geocode', { lat, lng });

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      console.error("Reverse Geocoding failed:", data);
      throw new Error(data.error_message || 'Address not found');
    }
  } catch (error) {
    console.warn('Server reverse geocoding failed, trying browser fallback:', error);
    try {
      return await reverseGeocodeClientFallback(lat, lng);
    } catch (fallbackError) {
      console.error('Reverse Geocoding fallback error:', fallbackError);
      throw error;
    }
  }
}

export async function getRouteToHospital(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteMetrics> {
  try {
    const data = await callMapsApi('route', { origin, destination });
    if (data.error) throw new Error(data.error.message);
    
    const route = data.routes?.[0];
    if (!route) throw new Error("No route found");

    return {
      totalDistanceMeters: route.distanceMeters || 0,
      totalDurationSeconds: route.duration ? parseInt(route.duration.replace('s', '')) : 0,
      encodedPolyline: route.polyline?.encodedPolyline
    };
  } catch (error) {
    console.error("Metric Calculation Error:", error);
    throw error;
  }
}