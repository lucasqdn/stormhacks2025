import * as ExpoSpeech from 'expo-speech';

function speak(text, options = {}) {
  if (!text) return;
  if (ExpoSpeech && typeof ExpoSpeech.speak === 'function') {
    ExpoSpeech.speak(text, options);
  } else {
    console.log('TTS:', text);
  }
}

function stop() {
  if (ExpoSpeech && typeof ExpoSpeech.stop === 'function') {
    ExpoSpeech.stop();
  }
}

export default { speak, stop };
