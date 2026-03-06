export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

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

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    );
    const data = await response.json();

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
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      console.error("Reverse Geocoding failed:", data);
      throw new Error(data.error_message || 'Address not found');
    }
  } catch (error) {
    console.error("Reverse Geocoding Error:", error);
    throw error;
  }
}

export async function getRouteToHospital(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteMetrics> {
  const requestBody = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } }
    },
    destination: {
      location: { latLng: { latitude: destination.lat, longitude: destination.lng } }
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  try {
    const response = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
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
