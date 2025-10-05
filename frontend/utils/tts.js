import { Platform } from 'react-native';
let expoSpeech = null;
let rnTts = null;

try {
  expoSpeech = require('expo-speech');
} catch (e) {
  expoSpeech = null;
}

try {
  rnTts = require('react-native-tts');
} catch (e) {
  rnTts = null;
}

function speak(text, options = {}) {
  if (!text) return;
  if (expoSpeech && expoSpeech.speak) {
    expoSpeech.speak(text, options);
    return;
  }
  if (rnTts && rnTts.speak) {
    rnTts.speak(text);
    return;
  }
  console.log('TTS:', text);
}

function stop() {
  if (expoSpeech && expoSpeech.stop) {
    expoSpeech.stop();
    return;
  }
  if (rnTts && rnTts.stop) {
    rnTts.stop();
    return;
  }
}

export default { speak, stop };
