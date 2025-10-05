const express = require('express');
const router = express.Router();
const { sendImageToPython } = require('../services/pythonAPI');

router.post('/frame', async (req, res) => {
    const {image, target} = req.body;
    if (!image) return res.status(400).json({ error: "No frame received"});

    try {
        const result = await sendImageToPython(image,target);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Python service unavailable"});
    };
}