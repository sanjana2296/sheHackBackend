import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

const app = express();
const port = 5001;

// Middleware
app.use(cors({
  credentials: true,
  origin: process.env.NETLIFY_URL || "http://localhost:3000",
}));
app.use(express.json());

const slackToken = process.env.REACT_APP_SLACK_OAUTH_TOKEN;
const huggingFaceToken = process.env.HUGGING_FACE_TOKEN;
const apyToken = process.env.APYHUB_TOKEN || 'your_apyhub_token_here'; // replace or load from .env

// ===================== SLACK: Fetch Channels =====================
app.get('/api/channels', async (req, res) => {
    try {
      const response = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${slackToken}` }
    });

      if (response.data.ok) {
        res.json({ channels: response.data.channels });
      } else {
        res.status(500).json({ error: response.data.error });
      }
    } catch (error) {
      console.error('Error fetching channels:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

// ===================== SLACK: Fetch + Summarize Messages =====================
app.get('/api/messages', async (req, res) => {
  const channelId = req.query.channelId;

  try {
    const response = await axios.get(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: { Authorization: `Bearer ${slackToken}` }
    });

    const messages = response.data.messages.map(msg => msg.text).join(' ');
    const chunkSize = 1024;
    const inputChunks = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      inputChunks.push(messages.slice(i, i + chunkSize));
    }

    let summary = "";

    for (const chunk of inputChunks) {
        const summaryResponse = await axios.post(
          'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
          { inputs: chunk },
        { headers: { Authorization: `Bearer ${huggingFaceToken}` } }
        );
        summary += summaryResponse.data[0].summary_text + " ";
      }

    res.json({ summary: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/slack/messages', async (req, res) => {
  const channelId = 'C08JXG5U4SW';  // Slack channel ID

  try {
    const response = await axios.get(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: { Authorization: `Bearer ${slackToken}` }
    });

    if (response.data.ok) {
      res.json(response.data.messages);  
    } else {
      res.status(500).json({ error: response.data.error });
    }
  } catch (error) {
    console.error('Raw Slack fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages from Slack' });
  }
});

// ===================== APYHUB: Summarize a Web URL =====================
app.post('/summarize', async (req, res) => {
  console.log('📥 Received request body:', req.body);
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
          'apy-token': 'APY0s6vpVu4zog9Z9flJl6mf2i4qEgBkNUgTHtR1h7Rq751K6ABOQQm6iS6Uk7KrI8F3y'
        }
      }
    );

    console.log('✅ ApyHub response:', response.data);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || err.message;
    console.error('❌ API call failed:', message);
    res.status(status).json({ error: 'API call failed', details: message });
  }
});

// ===================== START SERVER =====================
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

