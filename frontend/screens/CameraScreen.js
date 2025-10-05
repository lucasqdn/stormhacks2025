import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Modal, TextInput, Image, Platform, Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import api from '../services/api';
import tts from '../utils/tts';

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // {label, translation, audio_url}
  const [capturedUri, setCapturedUri] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [endpointInput, setEndpointInput] = useState(api.getEndpoint());
  const [targetLang, setTargetLang] = useState('ko');

  // Animations
  const topBarY = useRef(new Animated.Value(-30)).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;
  const resultY = useRef(new Animated.Value(40)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const shutterPulse = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const analyzingShimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // top bar enter
    Animated.parallel([
      Animated.timing(topBarY, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(topBarOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // shutter pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shutterPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shutterPulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (permission && permission.status === 'undetermined') requestPermission();
    if (permission?.granted) tts.speak('Camera ready. Tap the shutter to capture.');
    return () => tts.stop();
  }, [permission]);

  useEffect(() => {
    if (!lastResult) return;
    resultY.setValue(40);
    resultOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(resultY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [lastResult]);

  const screenFlash = () => {
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.9, duration: 90, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const startShimmer = () => {
    analyzingShimmer.setValue(0);
    Animated.loop(
      Animated.timing(analyzingShimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
  };
  const stopShimmer = () => analyzingShimmer.stopAnimation();

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      tts.speak('Capturing now.');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      screenFlash();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5, base64: true, skipProcessing: true,
      });
      setCapturedUri(photo?.uri || null);

      await new Promise((r) => setTimeout(r, 250));
      tts.speak('Analyzing, please wait.');
      startShimmer();

      const payload = { image_base64: photo?.base64 || '', target_lang: targetLang };
      const resp = await api.identifyObject(payload);

      stopShimmer();

      if (resp) {
        const result = {
          label: resp.word || resp.label || '',
          translation: resp.translation || '',
          audio_url: resp.audio_url || '',
        };
        setLastResult(result);

        tts.speak(result.translation || result.label || 'identified');
        // If you prefer the ElevenLabs audio_url returned by backend, play via your tts util instead
      } else {
        tts.speak('Could not identify the object. Try again.');
      }
    } catch (err) {
      stopShimmer();
      console.log('capture error', err?.message || err);
      await new Promise((r) => setTimeout(r, 600));
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
      const url = new URL(endpointInput);
      if (!/^https?:$/.test(url.protocol)) throw new Error('Only http or https is allowed.');
      api.setEndpoint(endpointInput);
      setSettingsVisible(false);
      tts.speak('Settings saved.');
    } catch (e) {
      Alert.alert('Invalid URL', e?.message || 'Please enter a valid server URL.');
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerDark}><Text style={styles.white}>Requesting camera permission...</Text></View>
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

  // animated values derived
  const pulseScale = shutterPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const pulseOpacity = shutterPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0] });
  const shimmerX = analyzingShimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, 160] });

  return (
    <View style={styles.full}>
      <LinearGradient colors={['#0b0b10', '#0b0b10', '#0b0b10']} style={StyleSheet.absoluteFill} />

      <CameraView
        style={styles.full}
        facing="back"
        ref={cameraRef}
        accessible
        accessibilityLabel="Camera preview"
        onError={(e) => console.warn('Camera error:', e?.nativeEvent || e)}
      />

      {/* Top bar */}
      <Animated.View style={[styles.topOverlay, { transform: [{ translateY: topBarY }], opacity: topBarOpacity }]} pointerEvents="box-none">
        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.glassBar}>
          <Text style={styles.brand}>LingoLens</Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={() => tts.speak('Tap the shutter to capture and translate.')} style={styles.glassPill}>
              <Text style={styles.pillText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openSettings} style={styles.glassPill}>
              <Text style={styles.pillText}>{targetLang.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* Result card */}
      <Animated.View style={[styles.bottomOverlay, { transform: [{ translateY: resultY }], opacity: resultOpacity }]} pointerEvents="box-none">
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewOverlay} accessibilityLabel="Captured preview" />
        ) : null}

        <BlurView intensity={40} tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'} style={styles.resultGlass}>
          {lastResult ? (
            <>
              <Text style={styles.resultMain} numberOfLines={2}>
                {lastResult.translation || lastResult.label}
              </Text>
              {lastResult?.label && lastResult?.translation ? (
                <Text style={styles.resultSub} numberOfLines={1}>{lastResult.label}</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[styles.resultMain, { color: '#aaa' }]}>Capture to translate</Text>
              {isProcessing ? (
                <View style={{ height: 10, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
                  <Animated.View
                    style={{
                      position: 'absolute', left: shimmerX, top: 0, bottom: 0, width: 120,
                      backgroundColor: 'rgba(255,255,255,0.2)', transform: [{ skewX: '20deg' }]
                    }}
                  />
                </View>
              ) : null}
            </>
          )}
        </BlurView>
      </Animated.View>

      {/* Toolbar */}
      <View style={styles.toolbarWrap} pointerEvents="box-none">
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={() => {
              if (lastResult) {
                const text = lastResult.translation || lastResult.label;
                tts.speak(text);
              } else {
                tts.speak('No previous result to repeat');
              }
            }}
            style={styles.toolBtn}
          >
            <Ionicons name="volume-high" size={22} color="#fff" />
            <Text style={styles.toolLabel}>Repeat</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openSettings} style={styles.toolBtn}>
            <Ionicons name="settings-sharp" size={22} color="#fff" />
            <Text style={styles.toolLabel}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTargetLang(l => (l === 'ko' ? 'es' : l === 'es' ? 'fr' : 'ko'))}
            style={styles.toolBtn}
          >
            <MaterialCommunityIcons name="translate" size={22} color="#fff" />
            <Text style={styles.toolLabel}>{targetLang.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shutter w/ pulsing halo */}
      <View style={styles.shutterWrap} pointerEvents="box-none">
        <Animated.View style={[styles.pulseHalo, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
        <TouchableOpacity
          onPress={handleCapture}
          accessibilityRole="button"
          accessibilityLabel="Capture image"
          activeOpacity={0.85}
          style={[styles.shutterButton, isProcessing && { opacity: 0.65 }]}
        >
          {isProcessing ? <ActivityIndicator color="#000" /> : null}
        </TouchableOpacity>
      </View>

      {/* Flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashOpacity }]} />

      {/* Settings modal */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalCenter}>
          <BlurView intensity={50} tint={Platform.OS === 'ios' ? 'systemThinMaterialDark' : 'dark'} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Settings</Text>

            <Text style={styles.modalLabel}>Target Language (e.g., ko, es, fr)</Text>
            <TextInput
              style={styles.input}
              value={targetLang}
              onChangeText={setTargetLang}
              autoCapitalize="none"
              placeholder="ko"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.modalLabel}>ML Endpoint URL</Text>
            <TextInput
              style={styles.input}
              value={endpointInput}
              onChangeText={setEndpointInput}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="http://192.168.x.x:8000"
              placeholderTextColor="#aaa"
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
  glassBar: { borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(18,18,22,0.35)' },
  brand: { color: '#fff', fontWeight: '800', letterSpacing: 0.5, fontSize: 18 },
  topActions: { flexDirection: 'row' },
  glassPill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, marginLeft: 8 },
  pillText: { color: '#fff', fontWeight: '600' },

  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 120, paddingHorizontal: 16, alignItems: 'center' },
  previewOverlay: { width: 120, height: 120, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  resultGlass: { borderRadius: 18, padding: 14, backgroundColor: 'rgba(18,18,22,0.5)', alignSelf: 'stretch', overflow: 'hidden' },
  resultMain: { color: '#fff', fontSize: 22, fontWeight: '700' },
  resultSub: { color: '#cfcfcf', marginTop: 6, fontSize: 14 },

  toolbarWrap: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center' },
  toolbar: { flexDirection: 'row', backgroundColor: 'rgba(18,18,22,0.55)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  toolLabel: { color: '#fff', marginLeft: 6, fontWeight: '600' },

  shutterWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  pulseHalo: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: '#22c55e' },
  shutterButton: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)' },

  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '86%', borderRadius: 18, padding: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalLabel: { color: '#ddd', marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', padding: 10, marginTop: 6, borderRadius: 10 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
});
