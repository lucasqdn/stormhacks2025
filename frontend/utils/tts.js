import axios from 'axios';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';

const ELEVEN_LABS_API_KEY = 'sk_57a1fae55d1d2869126a250c3daeac4a3dcc45ca3f7c21a6'; // Replace with your API key
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

export default { speak, stop };
