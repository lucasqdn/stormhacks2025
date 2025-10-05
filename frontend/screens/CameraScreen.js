import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import UIActionsContext from '../contexts/UIActionsContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import api from '../services/api';
import tts from '../utils/tts';
import theme from '../utils/theme';
import { BlurView } from 'expo-blur';

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // will store { label, audio_url?, ... }
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [endpointInput, setEndpointInput] = useState(api.getEndpoint());
  const [language, setLanguage] = useState(api.getTargetLanguage ? api.getTargetLanguage() : 'en');

  useEffect(() => {
    // Auto-request permission on first load if status is undetermined
    if (permission && permission.status === 'undetermined') {
      requestPermission();
    }
    if (permission?.granted) tts.speak('Camera ready.');
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

  const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true, skipProcessing: true });
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
    setLanguage(api.getTargetLanguage ? api.getTargetLanguage() : 'en');
    setSettingsVisible(true);
  };

  const saveSettings = () => {
    api.setEndpoint(endpointInput);
    if (api.setTargetLanguage) api.setTargetLanguage(language);
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
    <View style={styles.full}
      accessible
      accessibilityLabel="Language learning camera view">
      <CameraView
        style={styles.full}
        facing="back"
        ref={cameraRef}
        onError={(e) => console.warn('Camera error:', e?.nativeEvent || e)}
      />

      {/* Top glass header */}
      <View style={styles.topOverlayContainer} pointerEvents="box-none">
        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.glassBar}>
          <Text style={styles.brand}>LingoLens</Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={readHelp} accessibilityLabel="Help" style={styles.glassPill}>
              <Text style={styles.pillText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openSettings} accessibilityLabel="Settings" style={styles.glassPill}>
              <Text style={styles.pillText}>{language?.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Bottom glass result panel */}
      <View style={styles.bottomOverlayContainer} pointerEvents="box-none">
        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.resultGlass}>
          <Text style={styles.resultMain} numberOfLines={2}>
            {lastResult ? (lastResult.label || lastResult.word) : 'Capture text or objects to translate'}
          </Text>
          <View style={styles.resultRow}>
            <TouchableOpacity
              style={styles.smallPill}
              onPress={async () => {
                if (!lastResult) return tts.speak('No result to play');
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
            >
              <Text style={styles.pillText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallPill}
              onPress={() => {
                if (lastResult) {
                  const text = lastResult.label || lastResult.word || String(lastResult);
                  tts.speak(text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else tts.speak('No previous result to repeat');
              }}
            >
              <Text style={styles.pillText}>Repeat</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Shutter button */}
      <View style={styles.shutterWrap} pointerEvents="box-none">
        <TouchableOpacity
          onPress={handleCapture}
          accessibilityRole="button"
          accessibilityLabel="Capture image"
          style={[styles.shutterButton, isProcessing && { opacity: 0.6 }]}
        >
          {isProcessing && <ActivityIndicator color="#000" />}
        </TouchableOpacity>
      </View>

      {/* Settings modal */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalCenterWrap}>
          <BlurView intensity={50} tint={Platform.OS === 'ios' ? 'systemThinMaterialDark' : 'dark'} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.modalLabel}>Target language (ISO code)</Text>
            <TextInput
              style={styles.input}
              value={language}
              onChangeText={setLanguage}
              autoCapitalize="none"
              placeholder="e.g., en, es, fr, de, ja"
              placeholderTextColor="#aaa"
            />
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
  topOverlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16 },
  glassBar: { borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  topActions: { flexDirection: 'row' },
  glassPill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, marginLeft: 8 },
  pillText: { color: '#fff', fontWeight: '600' },
  bottomOverlayContainer: { position: 'absolute', left: 0, right: 0, bottom: 140, paddingHorizontal: 16 },
  resultGlass: { borderRadius: 18, padding: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  resultMain: { color: '#fff', fontSize: 20, fontWeight: '700' },
  resultRow: { flexDirection: 'row', marginTop: 10 },
  smallPill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, marginRight: 10 },
  shutterWrap: { position: 'absolute', bottom: 36, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  shutterButton: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)' },
  modalCenterWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '86%', borderRadius: 18, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalLabel: { color: '#ddd', marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', padding: 10, marginTop: 6, borderRadius: 10 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
});
