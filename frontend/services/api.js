import axios from 'axios';

// Default ML endpoint (can be overridden at runtime)
let ML_ENDPOINT = 'http://localhost:5000/identify';
let BARCODE_ENDPOINT = 'http://localhost:5000/barcode';

const client = axios.create({
  timeout: 15000,
});

async function identifyImage(base64) {
  try {
    // API expects JSON with base64 property; adjust as needed
    const resp = await client.post(ML_ENDPOINT, { image_base64: base64 });
    // Return the raw response data so the frontend can handle label, audio_url, etc.
    if (resp && resp.data) {
      return resp.data;
    }
    return null;
  } catch (err) {
    console.warn('identifyImage error', err.message || err.toString());
    throw err;
  }
}

async function lookupBarcode(code) {
  try {
    const resp = await client.get(`${BARCODE_ENDPOINT}`, { params: { code } });
    // Expected response: { label: '...' } or { product: '...' }
    if (resp && resp.data) {
      return resp.data.label || resp.data.product || resp.data.name || null;
    }
    return null;
  } catch (err) {
    console.warn('lookupBarcode error', err.message || err.toString());
    throw err;
  }
}

function setEndpoint(url) {
  ML_ENDPOINT = url;
}

function getEndpoint() {
  return ML_ENDPOINT;
}
function setBarcodeEndpoint(url) {
  BARCODE_ENDPOINT = url;
}

function getBarcodeEndpoint() {
  return BARCODE_ENDPOINT;
}

export default { identifyImage, lookupBarcode, setEndpoint, getEndpoint, setBarcodeEndpoint, getBarcodeEndpoint };
