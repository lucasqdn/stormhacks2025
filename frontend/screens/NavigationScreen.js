import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import tts from '../utils/tts';
import maps from '../services/maps';

export default function NavigationScreen({ destinationText, apiKey }) {
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [route, setRoute] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const cameraRef = useRef(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const locationWatchRef = useRef(null);

  function haversine(a, b) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  useEffect(() => {
    (async () => {
      try {
        if (!apiKey) {
          tts.speak('Google Maps API key is missing. Please set it before starting navigation.');
          console.warn('Missing Google Maps API key');
          return;
        }
        if (!camPermission?.granted) {
          await requestCamPermission();
        }
        const cur = await maps.getCurrentPositionAsync();
        setOrigin(cur);
        const d = await maps.geocodeAddress(destinationText, apiKey);
        setDest(d);
        const r = await maps.fetchDirections(cur, d, apiKey);
        setRoute(r);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStepIndex(0);
        tts.speak(`Route ready. First step: ${r.steps[0]?.instruction || 'Proceed to the route'}`);
      } catch (e) {
        console.warn('nav error', e);
        tts.speak('Navigation error. Please check permissions and API key.');
      }
    })();
  }, [destinationText, apiKey, camPermission]);

  useEffect(() => {
    if (!route) return;
    // Start watching location and update current step
    (async () => {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (pos) => {
          const current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setOrigin(current);
          const steps = route.steps || [];
          if (!steps.length) return;
          const nextIdx = Math.min(stepIndex, steps.length - 1);
          const target = steps[nextIdx].end;
          const dist = haversine(current, target);
          // If within 20m of the next step endpoint, advance
          if (dist < 20 && nextIdx < steps.length - 1) {
            const newIdx = nextIdx + 1;
            setStepIndex(newIdx);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const text = steps[newIdx]?.instruction || 'Continue';
            tts.speak(text);
          } else if (dist < 20 && nextIdx === steps.length - 1) {
            // Arrived
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            tts.speak('You have arrived at your destination.');
          }
        }
      );
      locationWatchRef.current = sub;
    })();
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [route, stepIndex]);

  if (!route || !origin) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator color="#fff" />
        <Text style={styles.loading}>Preparing navigation…</Text>
      </View>
    );
  }

  if (camPermission && !camPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Camera permission is required to show the preview.</Text>
        <Text style={styles.loading}>Please enable it in Settings or tap to grant.</Text>
      </View>
    );
  }

  const region = {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} showsUserLocation>
        <Marker coordinate={origin} title="You" />
        <Marker coordinate={dest} title="Destination" pinColor="green" />
        <Polyline coordinates={route.points} strokeColor="#0a84ff" strokeWidth={4} />
      </MapView>
      <View style={styles.cameraOverlay} pointerEvents="none">
        <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      </View>
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{route.steps[stepIndex]?.instruction || 'Follow the route'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  cameraOverlay: { position: 'absolute', right: 12, bottom: 120, width: 140, height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#0a84ff' },
  camera: { width: '100%', height: '100%' },
  instructions: { position: 'absolute', bottom: 20, left: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12 },
  instructionText: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  loading: { color: '#fff', marginTop: 8 },
});
