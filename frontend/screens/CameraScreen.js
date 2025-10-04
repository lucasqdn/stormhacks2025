import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as Haptics from 'react-native-haptic-feedback';
import * as Permissions from 'expo-permissions';
import api from '../services/api';
import tts from '../utils/tts';

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState('');

  useEffect(() => {
    (async () => {
      // Request camera permission
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        tts.speak('Ready to scan.');
      } else {
        tts.speak('Camera permission denied. Please enable camera permissions in settings.');
      }
    })();
    return () => {
      tts.stop();
    };
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      tts.speak('Capturing now.');
      Haptics.trigger('impactLight');

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true, skipProcessing: true });
      tts.speak('Analyzing, please wait.');

      const label = await api.identifyImage(photo.base64);

      if (label) {
        setLastResult(label);
        tts.speak(`Product: ${label}`);
      } else {
        tts.speak('Could not identify the product. Try again.');
      }
    } catch (err) {
      console.log('capture error', err.message || err);
      tts.speak('There was an error. Check network or try again.');
      Alert.alert('Error', err.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>No access to camera.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        ref={cameraRef}
        ratio="4:3"
        accessible={true}
        accessibilityLabel="Camera preview"
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
        >
          {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.captureText}>Scan</Text>}
        </TouchableOpacity>

        <View style={styles.resultBox} accessible={true} accessibilityLabel={`Last result: ${lastResult}`}>
          <Text style={styles.resultText}>{lastResult ? `Result: ${lastResult}` : 'No result yet'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: {
    padding: 20,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  captureButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  captureText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultBox: { padding: 10, marginTop: 6 },
  resultText: { color: '#fff' },
});
