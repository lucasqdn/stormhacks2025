import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Image } from 'react-native';
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
  const [lastResult, setLastResult] = useState(null); // { word/label, translation?, audio_url? }
  const [capturedUri, setCapturedUri] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [endpointInput, setEndpointInput] = useState(api.getEndpoint());
  const [targetLang, setTargetLang] = useState('ko'); // <- language to request from backend

  useEffect(() => {
    if (permission && permission.status === 'undetermined') requestPermission();
    if (permission?.granted) tts.speak('Ready to learn. Point at an object and tap Scan.');
    return () => tts.stop();
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      tts.speak('Capturing now.');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });
      setCapturedUri(photo?.uri || null);

      tts.speak('Analyzing, please wait.');

      // Build JSON payload for Python backend
      const payload = {
        image_base64: photo?.base64 || '',
        target_lang: targetLang, // e.g. 'ko', 'es', 'fr'
      };

      // Expect backend to return: { word, translation, audio_url }
      const resp = await api.identifyObject(payload);

      if (resp) {
        const resultObj = {
          label: resp.word || resp.label || '',
          translation: resp.translation || '',
          audio_url: resp.audio_url || '',
        };
        setLastResult(resultObj);

        // Speak and/or auto-play
        const spoken = resultObj.translation || resultObj.label || 'identified';
        tts.speak(spoken);
        if (resultObj.audio_url) {
          try {
            const { sound } = await Audio.Sound.createAsync({ uri: resultObj.audio_url });
            await sound.playAsync();
          } catch (e) {
            console.warn('autoplay failed', e);
          }
        }
      } else {
        tts.speak('Could not identify the object. Try again.');
      }
    } catch (err) {
      console.log('capture error', err?.message || err);
      tts.speak('There was an error. Check network or try again.');
      Alert.alert('Error', err?.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const openSettings = () => {
    setEndpointInput(api.getEndpoint());
    setSettingsVisible(true);
  };

  const saveSettings = () => {
    try {
      // basic sanity; allow http/https
      const url = new URL(endpointInput);
      if (!/^https?:$/.test(url.protocol)) throw new Error('Only http or https is allowed.');
      api.setEndpoint(endpointInput);
      setSettingsVisible(false);
      tts.speak('Settings saved.');
    } catch (e) {
      Alert.alert('Invalid URL', e?.message || 'Please enter a valid server URL.');
    }
  };

  const readHelp = () => {
    const helpText =
      'Tap Scan to take a photo of an object. We will identify it, show the word and translation, and play the pronunciation. Open Settings to change the server or target language.';
    tts.speak(helpText);
  };

  // Footer actions (if you use a parent footer)
  const actionsRef = useContext(UIActionsContext);
  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.onScan = handleCapture;
    actionsRef.onRepeat = () => {
      if (lastResult) {
        const text = lastResult.translation || lastResult.label || String(lastResult);
        tts.speak(text);
      } else tts.speak('No previous result to repeat');
    };
    actionsRef.onSettings = openSettings;
    actionsRef.onHelp = readHelp;
    return () => {
      if (!actionsRef) return;
      actionsRef.onScan = null;
      actionsRef.onRepeat = null;
      actionsRef.onSettings = null;
      actionsRef.onHelp = null;
    };
  }, [actionsRef, lastResult, targetLang, endpointInput]);

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LinguaCam — Learn by Sight</Text>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerButton} onPress={readHelp} accessibilityLabel="Help">
            <Text style={styles.headerButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={openSettings} accessibilityLabel="Settings">
            <Text style={styles.headerButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera */}
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        accessible
        accessibilityLabel="Camera preview"
        onError={(e) => console.warn('Camera error:', e?.nativeEvent || e)}
      />

      {/* Controls & Result */}
      <View style={styles.controls}>
        <Text style={styles.instructions}>
          Point the camera at an object and press Scan. We’ll show the word and play the pronunciation.
        </Text>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Capture photo to identify object"
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.captureText}>Scan</Text>
          )}
        </TouchableOpacity>

        {/* Preview + Result */}
        <View style={styles.resultRowColumn}>
          {capturedUri ? (
            <Image source={{ uri: capturedUri }} style={styles.preview} accessibilityLabel="Captured image preview" />
          ) : null}

          <View
            style={styles.largeResult}
            accessible
            accessibilityLabel={`Last result: ${lastResult?.translation || lastResult?.label || ''}`}
          >
            <Text style={styles.largeResultText}>
              {lastResult ? (lastResult.translation || lastResult.label) : 'No result yet'}
            </Text>
            {lastResult?.label && lastResult?.translation && (
              <Text style={styles.subLabel}>{lastResult.label}</Text>
            )}
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
                    tts.speak(lastResult.translation || lastResult.label || 'identified');
                  }
                } else {
                  tts.speak(lastResult.translation || lastResult.label || 'identified');
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Play pronunciation"
            >
              <Text style={styles.playText}>Play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.repeatButton}
              onPress={() => {
                if (lastResult) {
                  const text = lastResult.translation || lastResult.label || String(lastResult);
                  tts.speak(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                  tts.speak('No previous result to repeat');
                }
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Repeat last result"
            >
              <Text style={styles.repeatText}>Repeat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings */}
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
            placeholder="http://10.0.2.2:8000"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.modalLabel}>Target Language (e.g., ko, es, fr)</Text>
          <TextInput
            style={styles.input}
            value={targetLang}
            onChangeText={setTargetLang}
            autoCapitalize="none"
            placeholder="ko"
            placeholderTextColor={theme.colors.muted}
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

  controls: {
    padding: theme.spacing(2),
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  instructions: { color: theme.colors.muted, marginBottom: theme.spacing(1) },

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

  centerDark: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  white: { color: theme.colors.text },

  resultRowColumn: { width: '100%', alignItems: 'center' },
  preview: { width: 160, height: 160, borderRadius: 10, marginTop: theme.spacing(1) },

  largeResult: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    minWidth: '70%',
    alignItems: 'center',
  },
  largeResultText: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subLabel: { color: theme.colors.muted, fontSize: 14, marginTop: 6 },

  resultButtonsRow: { flexDirection: 'row', marginTop: theme.spacing(1), alignItems: 'center' },
  playButton: { marginRight: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 8 },
  playText: { color: theme.colors.text, fontWeight: '700' },
  repeatButton: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.surface, borderRadius: 8 },
  repeatText: { color: theme.colors.text },

  modalContainer: { flex: 1, padding: theme.spacing(2), backgroundColor: theme.colors.surface },
  modalTitle: { color: theme.colors.text, fontSize: 20, marginBottom: theme.spacing(1) },
  modalLabel: { color: theme.colors.muted, marginTop: theme.spacing(1) },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 10, marginTop: 6, borderRadius: 6 },

  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing(2) },
  modalButton: { marginLeft: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.primary, borderRadius: 6 },
  modalButtonText: { color: theme.colors.text },
});
