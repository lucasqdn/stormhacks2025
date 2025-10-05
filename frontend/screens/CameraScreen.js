import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import UIActionsContext from '../contexts/UIActionsContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import api from '../services/api';
import tts from '../utils/tts';
import theme from '../utils/theme';

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // will store { label, audio_url?, ... }
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
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      tts.speak('Capturing now.');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true, skipProcessing: true });
      tts.speak('Analyzing, please wait.');

      const resp = await api.identifyImage(photo.base64);

      if (resp) {
        // resp may be string or object
        const resultObj = typeof resp === 'string' ? { label: resp } : resp;
        setLastResult(resultObj);
        const spoken = resultObj.label || resultObj.word || 'identified';
        tts.speak(spoken);
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
      if (lastResult) {
        const text = lastResult.label || lastResult.word || String(lastResult);
        tts.speak(text);
      } else tts.speak('No previous result to repeat');
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
        <Text style={{ color: theme.colors.text, marginBottom: 12 }}>No access to camera.</Text>
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
          {isProcessing ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.captureText}>Scan</Text>}
        </TouchableOpacity>

        <View style={styles.resultRowColumn}>
          <View style={styles.largeResult} accessible={true} accessibilityLabel={`Last result: ${lastResult?.label || lastResult?.word || ''}`}>
            <Text style={styles.largeResultText}>{lastResult ? (lastResult.label || lastResult.word) : 'No result yet'}</Text>
          </View>

          <View style={styles.resultButtonsRow}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={async () => {
                if (!lastResult) {
                  tts.speak('No result to play');
                  return;
                }
                if (lastResult.audio_url) {
                  try {
                    const { sound } = await Audio.Sound.createAsync({ uri: lastResult.audio_url });
                    await sound.playAsync();
                  } catch (e) {
                    console.warn('play audio failed', e);
                    tts.speak(lastResult.label || lastResult.word || 'identified');
                  }
                } else {
                  tts.speak(lastResult.label || lastResult.word || 'identified');
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Play pronunciation"
            >
              <Text style={styles.playText}>Play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.repeatButton}
              onPress={() => {
                if (lastResult) {
                  const text = lastResult.label || lastResult.word || String(lastResult);
                  tts.speak(text);
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  camera: { flex: 1 },
  header: { backgroundColor: theme.colors.primary, paddingTop: 32, paddingBottom: 10, paddingHorizontal: 12 },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  headerRow: { position: 'absolute', right: 12, top: 32, flexDirection: 'row' },
  headerButton: { marginLeft: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6 },
  headerButtonText: { color: theme.colors.text },
  instructions: { color: theme.colors.muted, marginBottom: theme.spacing(1) },
  controls: {
    padding: theme.spacing(2),
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  captureButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  captureText: { color: theme.colors.text, fontSize: 22, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerDark: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  white: { color: theme.colors.text },
  resultBox: { padding: 10, marginTop: 6 },
  resultText: { color: theme.colors.text },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultRowColumn: { width: '100%', alignItems: 'center' },
  largeResult: { padding: theme.spacing(2), marginTop: theme.spacing(1.5), backgroundColor: theme.colors.surface, borderRadius: 8, minWidth: '60%', alignItems: 'center' },
  largeResultText: { color: theme.colors.text, fontSize: 28, fontWeight: '700' },
  resultButtonsRow: { flexDirection: 'row', marginTop: theme.spacing(1), alignItems: 'center' },
  playButton: { marginRight: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 8 },
  playText: { color: theme.colors.text, fontWeight: '700' },
  repeatButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  repeatText: { color: theme.colors.text },
  modalContainer: { flex: 1, padding: theme.spacing(2), backgroundColor: theme.colors.surface },
  modalTitle: { color: theme.colors.text, fontSize: 20, marginBottom: theme.spacing(1) },
  modalLabel: { color: theme.colors.muted, marginTop: theme.spacing(1) },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 10, marginTop: 6, borderRadius: 6 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing(2) },
  modalButton: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.primary, borderRadius: 6 },
  modalButtonText: { color: theme.colors.text },
});
