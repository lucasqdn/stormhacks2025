import * as ExpoSpeech from 'expo-speech';
import { Audio } from 'expo-av';

let currentSound = null;

async function speak(text, options = {}) {
  if (!text) return;
  try {
    if (ExpoSpeech && typeof ExpoSpeech.speak === 'function') {
      ExpoSpeech.speak(text, options);
    } else {
      console.log('TTS:', text);
    }
  } catch (error) {
    console.warn('TTS speak error:', error?.message || String(error));
  }
}

async function playBase64(base64Audio, mimeType = 'audio/mpeg') {
  if (!base64Audio) return;
  try {
    await stop();
    const source = { uri: `data:${mimeType};base64,${base64Audio}` };
    const { sound } = await Audio.Sound.createAsync(source);
    currentSound = sound;
    await sound.playAsync();
  } catch (error) {
    console.warn('playBase64 error:', error?.message || String(error));
  }
}

async function playUrl(url) {
  if (!url) return;
  try {
    await stop();
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    currentSound = sound;
    await sound.playAsync();
  } catch (error) {
    console.warn('playUrl error:', error?.message || String(error));
  }
}

async function stop() {
  try {
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }
    if (ExpoSpeech && typeof ExpoSpeech.stop === 'function') {
      ExpoSpeech.stop();
    }
  } catch (error) {
    console.warn('TTS stop error:', error?.message || String(error));
  }
}

export default { speak, stop, playBase64, playUrl };
