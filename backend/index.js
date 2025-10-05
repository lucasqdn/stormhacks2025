const express = require('express');
const cors = require('cors');
const scanRouter = require('./routes/scan')

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb'}));

app.use('/scan', scanRouter);

app.get('/', (req, res) => {
    res.send("Node.js is working properly");
});

app.listen(PORT, () => {
    console.log(`Server is running at port https://localhost:${PORT}`);
})