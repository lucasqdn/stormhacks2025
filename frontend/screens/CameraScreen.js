import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import UIActionsContext from '../contexts/UIActionsContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import tts from '../utils/tts';

export default function CameraScreen({ onClose }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState(null); // 'barcode' | null
  const [lastResult, setLastResult] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [endpointInput, setEndpointInput] = useState(api.getEndpoint());

  useEffect(() => {
    // Auto-request permission on first load if status is undetermined
    if (permission && permission.status === 'undetermined') {
      requestPermission();
    }
    if (permission?.granted) {
      tts.speak('Ready to scan.');
    }
    return () => {
      tts.stop();
    };
  }, [permission]);

  const handleCapture = async () => {
    // Toggle barcode scanning on first press; cancel on second press
    if (!scanMode) {
      setScanMode('barcode');
      tts.speak('Point the barcode at the camera');
      return;
    }
    if (scanMode === 'barcode') {
      setScanMode(null);
      tts.speak('Scan cancelled');
      return;
    }
  };

  const onBarCodeScanned = async ({ type, data }) => {
    if (isProcessing) return;
    // Log the raw barcode data and type to the terminal (Metro/VS Code)
    console.log('Barcode scanned:', { type, data });
    setIsProcessing(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      tts.speak('Barcode detected. Looking up product.');
      const result = await api.lookupBarcode(String(data));
      if (result) {
        setLastResult(result);
        tts.speak(`Product: ${result}`);
      } else {
        tts.speak('No product found for this code.');
      }
    } catch (err) {
      console.log('barcode error', err.message || err);
      tts.speak('There was an error looking up this code.');
      Alert.alert('Error', err.message || String(err));
    } finally {
      setIsProcessing(false);
      setScanMode(null);
    }
  };

  const openSettings = () => {
    setEndpointInput(api.getEndpoint());
    setSettingsVisible(true);
  };

  const saveSettings = () => {
    api.setEndpoint(endpointInput);
    setSettingsVisible(false);
    tts.speak('Settings saved');
  };

  const readHelp = () => {
    const helpText = 'To scan a product, point the camera at the product and press the Scan button. After analysis the app will speak the product name. Use the Repeat button to hear the last result again. In settings you can change the analysis server address.';
    tts.speak(helpText);
  };

  // Register UI actions so parent footer can trigger them
  const actionsRef = useContext(UIActionsContext);
  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.onScan = handleCapture;
    actionsRef.onRepeat = () => {
      if (lastResult) tts.speak(lastResult);
      else tts.speak('No previous result to repeat');
    };
    actionsRef.onSettings = openSettings;
    actionsRef.onHelp = readHelp;
    // cleanup
    return () => {
      if (!actionsRef) return;
      actionsRef.onScan = null;
      actionsRef.onRepeat = null;
      actionsRef.onSettings = null;
      actionsRef.onHelp = null;
    };
  }, [actionsRef, lastResult]);

  if (!permission) {
    return (
      <View style={styles.centerDark}>
        <Text style={styles.white}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerDark}>
        <Text style={{ color: '#fff', marginBottom: 12 }}>No access to camera.</Text>
        <TouchableOpacity style={styles.captureButton} onPress={requestPermission}>
          <Text style={styles.captureText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SightMate — Shopping Assistant</Text>
        <View style={styles.headerRow}>
          {onClose ? (
            <TouchableOpacity style={styles.headerButton} onPress={onClose} accessibilityLabel="Close camera">
              <Text style={styles.headerButtonText}>Close</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.headerButton} onPress={readHelp} accessibilityLabel="Help">
            <Text style={styles.headerButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={openSettings} accessibilityLabel="Settings">
            <Text style={styles.headerButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        accessible={true}
        accessibilityLabel="Camera preview"
        onError={(e) => {
          console.warn('Camera error:', e?.nativeEvent || e);
        }}
        onBarcodeScanned={scanMode === 'barcode' ? onBarCodeScanned : undefined}
        barcodeScannerSettings={scanMode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] } : undefined}
      />

      <View style={styles.controls}>
        <Text style={styles.instructions}>Point the camera at a product and press Scan. The result will be spoken aloud.</Text>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : scanMode === 'barcode' ? (
            <Text style={styles.captureText}>Cancel</Text>
          ) : (
            <Text style={styles.captureText}>Scan</Text>
          )}
        </TouchableOpacity>

        {scanMode === 'barcode' && (
          <Text style={{ color: '#9fd', marginTop: 8 }}>Scanning... align the barcode within the frame</Text>
        )}

        <View style={styles.resultRow}>
          <View style={styles.resultBox} accessible={true} accessibilityLabel={`Last result: ${lastResult}`}>
            <Text style={styles.resultText}>{lastResult ? `Result: ${lastResult}` : 'No result yet'}</Text>
          </View>

          <TouchableOpacity
            style={styles.repeatButton}
            onPress={() => {
              if (lastResult) {
                tts.speak(lastResult);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } else {
                tts.speak('No previous result to repeat');
              }
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Repeat last result"
          >
            <Text style={styles.repeatText}>Repeat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={settingsVisible} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Settings</Text>
          <Text style={styles.modalLabel}>ML Endpoint URL</Text>
          <TextInput
            style={styles.input}
            value={endpointInput}
            onChangeText={setEndpointInput}
            autoCapitalize="none"
            keyboardType="url"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={saveSettings}>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  header: { backgroundColor: '#0a84ff', paddingTop: 36, paddingBottom: 10, paddingHorizontal: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerRow: { position: 'absolute', right: 12, top: 36, flexDirection: 'row' },
  headerButton: { marginLeft: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6 },
  headerButtonText: { color: '#fff' },
  instructions: { color: '#ddd', marginBottom: 8 },
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
  centerDark: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  white: { color: '#fff' },
  resultBox: { padding: 10, marginTop: 6 },
  resultText: { color: '#fff' },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  repeatButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  repeatText: { color: '#fff' },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#111' },
  modalTitle: { color: '#fff', fontSize: 20, marginBottom: 12 },
  modalLabel: { color: '#ccc', marginTop: 8 },
  input: { backgroundColor: '#222', color: '#fff', padding: 10, marginTop: 6, borderRadius: 6 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#0a84ff', borderRadius: 6 },
  modalButtonText: { color: '#fff' },
});
