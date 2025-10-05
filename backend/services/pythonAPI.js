const axios = require('axios');

const PYTHON_API_URL = ''

async function sendImageToPython(imageBase64, targetProduct) {
    try {
        const response = await axios.post(PYTHON_API_URL, {
            image: imageBase64,
            target: targetProduct
        });
        return response.data;
    } catch (err) {
        console.error("Error in calling python api service:", err.message);
        throw err;
    }
}

module.exports = { sendImageToPython };