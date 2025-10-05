import * as Location from 'expo-location';
import polyline from 'polyline';

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

export async function getCurrentPositionAsync() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission not granted');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export async function geocodeAddress(address, apiKey) {
  const url = `${GOOGLE_MAPS_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.results?.length) throw new Error('Destination not found');
  const loc = data.results[0].geometry.location;
  return { latitude: loc.lat, longitude: loc.lng };
}

export async function fetchDirections(origin, destination, apiKey, mode = 'walking') {
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode,
    key: apiKey,
  });
  const url = `${GOOGLE_MAPS_BASE}/directions/json?${params.toString()}`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status !== 'OK') throw new Error(json.error_message || 'Directions error');
  const route = json.routes[0];
  const leg = route.legs[0];
  const points = polyline.decode(route.overview_polyline.points).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  const steps = leg.steps.map(s => ({
    instruction: s.html_instructions?.replace(/<[^>]+>/g, ''),
    distance: s.distance?.text,
    duration: s.duration?.text,
    start: { latitude: s.start_location.lat, longitude: s.start_location.lng },
    end: { latitude: s.end_location.lat, longitude: s.end_location.lng },
    maneuver: s.maneuver || null,
  }));
  return { points, steps, bounds: route.bounds, leg };
}

export default { getCurrentPositionAsync, geocodeAddress, fetchDirections };
