const GOOGLE_API_KEY = "AIzaSyBpYd5kz7vOQ-gMXP3Ci8vWgULD8hKONE4";

if (!GOOGLE_API_KEY) {
  console.warn("⚠️ Advertencia: No se encontró la variable VITE_GOOGLE_MAPS_API_KEY.");
}


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

let placesServicePromise: Promise<any> | null = null;

function getPlacesService() {
  if (placesServicePromise) return placesServicePromise;

  placesServicePromise = new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      resolve(new (window as any).google.maps.places.AutocompleteService());
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        resolve(new (window as any).google.maps.places.AutocompleteService());
      } else {
        reject(new Error("Google Maps Places library not loaded"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return placesServicePromise;
}

// Obtiene sugerencias mientras el usuario escribe, priorizando Argentina y la cercanía (si hay lat/lng)
export async function getAddressSuggestions(
  input: string, 
  currentLat?: number, 
  currentLng?: number
): Promise<PlaceSuggestion[]> {
  if (!input || input.length < 3) return [];

  try {
    const service = await getPlacesService();
    
    const request: any = {
      input,
      componentRestrictions: { country: 'ar' }
    };

    if (currentLat && currentLng && (window as any).google) {
      request.location = new (window as any).google.maps.LatLng(currentLat, currentLng);
      request.radius = 50000; // 50km
    }

    return new Promise((resolve) => {
      service.getPlacePredictions(request, (predictions: any[], status: any) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(predictions.map(p => ({
            description: p.description,
            placeId: p.place_id
          })));
        } else {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error("Autocomplete Error:", error);
    return [];
  }
}

export async function geocodePlaceId(placeId: string): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${GOOGLE_API_KEY}`
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