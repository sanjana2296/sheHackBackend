console.log("🚀 Starting server.js...");

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/summarize', async (req, res) => {
  console.log('Received request body:', req.body);

  try {
    const { url, summaryType, language } = req.body;

    const response = await axios.post(
      'https://api.apyhub.com/ai/summarize-url',
      {
        url,
        summary_length: summaryType,        
        output_language: language          
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apy-token': 'APY0EjG3Mylgf1dNFk4bP1GXL7AdX62wz9CRZTAanggut61ubfdZt1jATDR0eUPkS1BQqjBkh'
        }
      }
    );

    console.log('ApyHub response:', response.data);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || err.message;
    console.error('API call failed:', message);
    console.error('Full Error:', err);
    res.status(status).json({ error: 'API call failed', details: message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
