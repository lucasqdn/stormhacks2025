import * as ExpoSpeech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let currentSound = null;

async function _unloadCurrent() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
    } catch (e) {}
    try {
      await currentSound.unloadAsync();
    } catch (e) {}
    currentSound = null;
  }
}

async function playBase64(base64) {
  if (!base64) throw new Error('No base64 provided');
  const filename = `tts_${Date.now()}.mp3`;
  const path = FileSystem.cacheDirectory + filename;
  try {
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    await _unloadCurrent();
    const { sound } = await Audio.Sound.createAsync({ uri: path });
    currentSound = sound;
    await sound.playAsync();
    return;
  } catch (e) {
    console.warn('playBase64 failed', e);
    // try to clean up file if exists
    try { await FileSystem.deleteAsync(path, { idempotent: true }); } catch (e) {}
    throw e;
  }
}

async function playUrl(url) {
  if (!url) throw new Error('No url provided');
  try {
    await _unloadCurrent();
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    currentSound = sound;
    await sound.playAsync();
  } catch (e) {
    console.warn('playUrl failed', e);
    throw e;
  }
}

function speak(text, options = {}) {
  if (!text) return;
  if (ExpoSpeech && typeof ExpoSpeech.speak === 'function') {
    try { ExpoSpeech.speak(text, options); } catch (e) { console.warn('ExpoSpeech.speak failed', e); }
  } else {
    console.log('TTS:', text);
  }
}

async function stop() {
  if (ExpoSpeech && typeof ExpoSpeech.stop === 'function') {
    try { ExpoSpeech.stop(); } catch (e) { /* ignore */ }
  }
  await _unloadCurrent();
}

export default { speak, stop, playBase64, playUrl };
