import { Platform } from 'react-native';
let TtsLib = null;
try {
  // react-native-tts is listed in package.json
  TtsLib = require('react-native-tts');
} catch (e) {
  TtsLib = null;
}

function speak(text) {
  if (!text) return;
  if (TtsLib && TtsLib.speak) {
    TtsLib.speak(text);
  } else {
    // Fallback: no-op or console
    console.log('TTS:', text);
  }
}

function stop() {
  if (TtsLib && TtsLib.stop) {
    TtsLib.stop();
  }
}

export default { speak, stop };
