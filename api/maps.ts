import type { VercelRequest, VercelResponse } from '@vercel/node';

type MapsAction = 'geocode-place-id' | 'geocode-address' | 'reverse-geocode' | 'route' | 'autocomplete';

function getServerMapsApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('Missing GOOGLE_MAPS_API_KEY');
  }
  return key;
}

async function googleGeocodeRequest(query: string) {
  const key = getServerMapsApiKey();
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}&key=${key}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_message || 'Google Geocoding request failed');
  }

  return data;
}

async function googleRoutesRequest(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const key = getServerMapsApiKey();
  const requestBody = {
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Google Routes request failed';
    throw new Error(errorMessage);
  }

  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action: MapsAction | undefined = body?.action;

    if (!action) {
      return res.status(400).json({ error: 'Missing action' });
    }

    if (action === 'geocode-place-id') {
      if (!body.placeId) return res.status(400).json({ error: 'Missing placeId' });
      const data = await googleGeocodeRequest(`place_id=${encodeURIComponent(body.placeId)}`);
      return res.status(200).json(data);
    }

    if (action === 'geocode-address') {
      if (!body.address) return res.status(400).json({ error: 'Missing address' });
      const data = await googleGeocodeRequest(`address=${encodeURIComponent(body.address)}`);
      return res.status(200).json(data);
    }

    if (action === 'reverse-geocode') {
      if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
        return res.status(400).json({ error: 'Missing lat/lng' });
      }
      const data = await googleGeocodeRequest(`latlng=${body.lat},${body.lng}`);
      return res.status(200).json(data);
    }

    if (action === 'autocomplete') {
      if (!body.input) return res.status(400).json({ error: 'Missing input' });
      const key = getServerMapsApiKey();
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(body.input)}&components=country:ar&language=es&key=${key}`;
      if (typeof body.lat === 'number' && typeof body.lng === 'number') {
        url += `&location=${body.lat},${body.lng}&radius=50000`;
      }
      const response = await fetch(url);
      const data = await response.json();
      return res.status(response.ok ? 200 : 500).json(data);
    }

    if (action === 'route') {
      const origin = body.origin;
      const destination = body.destination;

      if (
        typeof origin?.lat !== 'number' ||
        typeof origin?.lng !== 'number' ||
        typeof destination?.lat !== 'number' ||
        typeof destination?.lng !== 'number'
      ) {
        return res.status(400).json({ error: 'Missing origin/destination' });
      }

      const data = await googleRoutesRequest(origin, destination);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Maps proxy error' });
  }
}
