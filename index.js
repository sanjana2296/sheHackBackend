import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = 5000;  
app.use(cors({
  credentials: true,
  origin: process.env.NETLIFY_URL || "http://localhost:3000",
}
));
const slackToken = process.env.REACT_APP_SLACK_OAUTH_TOKEN; 
const huggingFaceToken = process.env.HUGGING_FACE_TOKEN;

app.get('/api/channels', async (req, res) => {
    try {
      // Fetch the list of channels in the Slack workspace
      const response = await axios.get('https://slack.com/api/conversations.list', {
        headers: {
          Authorization: `Bearer ${slackToken}`,
        },
        params: {
        },
      });
  

      if (response.data.ok) {
        // console.log("channels:", response.data.channels);
        res.json({ channels: response.data.channels });
      } else {
        res.status(500).json({ error: response.data.error });
      }
    } catch (error) {
      console.error('Error fetching channels:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

app.get('/api/messages', async (req, res) => {
  const channelId = req.query.channelId;
  console.log("channel id:",channelId)
  try {
    // Fetch Slack messages
    const response = await axios.get(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: {
        Authorization: `Bearer ${slackToken}`,
      },
    });

    const messages = response.data.messages.map(msg => msg.text).join(' ');

    const chunkSize = 1024;  // The model limits
    const inputChunks = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      inputChunks.push(messages.slice(i, i + chunkSize));
    }

    let summary = "";

    for (let chunk of inputChunks) {
        const summaryResponse = await axios.post(
          'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
          { inputs: chunk },
          {
            headers: {
              Authorization: `Bearer ${huggingFaceToken}`,
            },
          }
        );
        summary += summaryResponse.data[0].summary_text + " ";
      }
  
    console.log("message",messages)
    // Call Hugging Face API for summarization
    // const summaryResponse = await axios.post(
    //   'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    //   { inputs: messages },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${huggingFaceToken}`,
    //     },
    //   }
    // );
    console.log("summary::",summary)
    // res.json({ summary: summaryResponse.data[0].summary_text });
    res.json({ summary: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Slack API route
app.get('/slack/messages', async (req, res) => {
  const channelId = 'C08JXG5U4SW';  // Slack channel ID

  try {
    const response = await axios.get(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: {
        Authorization: `Bearer ${slackToken}`,
      },
    });

    if (response.data.ok) {
      console.log(response.data.messages);
      res.json(response.data.messages);  
    } else {
      res.status(500).json({ error: response.data.error });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages from Slack' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

