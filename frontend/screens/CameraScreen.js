import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Image, Platform } from 'react-native';
import UIActionsContext from '../contexts/UIActionsContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
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
  const [langPickerVisible, setLangPickerVisible] = useState(false);

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: 'Korean' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ch', label: 'Chinese (Simplified)' },
    { code: 'ja', label: 'Japanese' },
    { code: 'pt', label: 'Portuguese' },
  ];

  useEffect(() => {
    if (permission && permission.status === 'undetermined') requestPermission();
    if (permission?.granted) tts.speak('Camera ready. Tap the shutter to capture.');
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

      // Build JSON payload for Python backend /process-image
      const payload = {
        image: photo?.base64 || '',
        src_lang: 'en',
        dest_lang: targetLang, // e.g. 'ko', 'es', 'fr'
      };

      // The backend returns { src_lang_description, dest_lang_description }
      const resp = await api.processImage(payload);

      if (resp) {
        const resultObj = {
          label: resp.src_lang_description || '',
          translation: resp.dest_lang_description || '',
        };
        setLastResult(resultObj);

        const spoken = resultObj.translation || resultObj.label || 'identified';
        // Speak using client-side TTS (Expo Speech) — no backend changes required
        tts.speak(spoken);
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
    <View style={styles.full}>
      <CameraView
        style={styles.full}
        facing="back"
        ref={cameraRef}
        accessible
        accessibilityLabel="Camera preview"
        onError={(e) => console.warn('Camera error:', e?.nativeEvent || e)}
      />

      {/* Top glass bar */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.glassBar}>
          <Text style={styles.brand}>LingoLens</Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={readHelp} accessibilityLabel="Help" style={styles.glassPill}>
              <Text style={styles.pillText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openSettings} accessibilityLabel="Settings" style={styles.glassPill}>
              <Text style={styles.pillText}>{targetLang.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Bottom glass panel + preview */}
      <View style={styles.bottomOverlay} pointerEvents="box-none">
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewOverlay} accessibilityLabel="Captured preview" />
        ) : null}
        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.resultGlass}>
          <Text style={styles.resultMain} numberOfLines={2}>
            {lastResult ? (lastResult.translation || lastResult.label) : 'Capture to translate'}
          </Text>
          {lastResult?.label && lastResult?.translation && (
            <Text style={styles.resultSub} numberOfLines={1}>{lastResult.label}</Text>
          )}
        </BlurView>
      </View>

      {/* White shutter button */}
      <View style={styles.shutterWrap} pointerEvents="box-none">
        <TouchableOpacity
          onPress={handleCapture}
          accessibilityRole="button"
          accessibilityLabel="Capture image"
          style={[styles.shutterButton, isProcessing && { opacity: 0.7 }]}
        >
          {isProcessing && <ActivityIndicator color={theme.colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Settings modal */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalCenter}>
          <BlurView intensity={50} tint={Platform.OS === 'ios' ? 'systemThinMaterialDark' : 'dark'} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.modalLabel}>Target Language</Text>
            <TouchableOpacity
              style={[styles.input, styles.langSelect]}
              onPress={() => setLangPickerVisible(!langPickerVisible)}
              accessibilityRole="button"
              accessibilityLabel="Select target language"
            >
              <Text style={{ color: theme.colors.text }}>{LANGUAGES.find(l => l.code === targetLang)?.label || targetLang}</Text>
            </TouchableOpacity>
            {langPickerVisible && (
              <View style={styles.langList}>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l.code}
                    style={styles.langItem}
                    onPress={() => { setTargetLang(l.code); setLangPickerVisible(false); }}
                  >
                    <Text style={styles.langItemText}>{l.label} ({l.code})</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.langItem} onPress={() => { setLangPickerVisible(false); }}>
                  <Text style={[styles.langItemText, { opacity: 0.8 }]}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.modalLabel}>ML Endpoint URL</Text>
            <TextInput
              style={styles.input}
              value={endpointInput}
              onChangeText={setEndpointInput}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.glassPill} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.pillText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.glassPill} onPress={saveSettings}>
                <Text style={styles.pillText}>Save</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  centerDark: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  white: { color: '#fff' },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16 },
  glassBar: { borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  topActions: { flexDirection: 'row' },
  glassPill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, marginLeft: 8 },
  pillText: { color: '#fff', fontWeight: '600' },

  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 120, paddingHorizontal: 16, alignItems: 'center' },
  previewOverlay: { width: 120, height: 120, borderRadius: 16, marginBottom: 10 },
  resultGlass: { borderRadius: 18, padding: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' },
  resultMain: { color: '#fff', fontSize: 20, fontWeight: '700' },
  resultSub: { color: '#ddd', marginTop: 6 },

  shutterWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)' },

  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '86%', borderRadius: 18, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalLabel: { color: '#ddd', marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', padding: 10, marginTop: 6, borderRadius: 10 },
  langSelect: { justifyContent: 'center' },
  langList: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 6 },
  langItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  langItemText: { color: '#fff' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
});
