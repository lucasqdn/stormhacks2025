import axios from 'axios';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';

const ELEVEN_LABS_API_KEY = 'sk_d980be769fde246147691208968da0d79f8adc4971b7d490'; // Replace with your API key
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const VOICE_ID = 'pqHfZKP75CvOlQylNhV4'; // Replace with the desired voice ID from ElevenLabs

async function speak(text, options = {}) {
  if (!text) return;

  try {
    // Make a request to ElevenLabs API
    const response = await axios.post(
      `${ELEVEN_LABS_API_URL}/${VOICE_ID}`,
      {
        text,
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.5,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        responseType: 'arraybuffer', // To handle audio data
      }
    );

    // Load and play the audio using Expo's Audio API
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: `data:audio/mpeg;base64,${Buffer.from(response.data).toString('base64')}` });
    await sound.playAsync();
  } catch (error) {
    console.error('Error with ElevenLabs TTS:', error);
  }
}

function stop() {
  // Expo's Audio API does not have a direct stop method for ongoing playback,
  // but you can unload the sound to stop it.
  Audio.Sound.createAsync().then(({ sound }) => {
    sound.unloadAsync();
  });
}

async function playBase64(base64Audio) {
  if (!base64Audio) return;

  try {
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: `data:audio/mpeg;base64,${base64Audio}` });
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing Base64 audio:', error);
  }
}

async function playUrl(audioUrl) {
  if (!audioUrl) return;

  try {
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: audioUrl });
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing audio from URL:', error);
  }
}

export default { speak, stop, playBase64, playUrl };