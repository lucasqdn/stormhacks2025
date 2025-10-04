import axios from 'axios';

// TODO: replace with your real ML service URL
const ML_ENDPOINT = 'http://localhost:5000/identify';

const client = axios.create({
  timeout: 15000,
});

async function identifyImage(base64) {
  try {
    // API expects JSON with base64 property; adjust as needed
    const resp = await client.post(ML_ENDPOINT, { image_base64: base64 });
    // Expected response: { label: '...' }
    if (resp && resp.data) {
      return resp.data.label || resp.data.result || null;
    }
    return null;
  } catch (err) {
    console.warn('identifyImage error', err.message || err.toString());
    throw err;
  }
}

export default { identifyImage };
