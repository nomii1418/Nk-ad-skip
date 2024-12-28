const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage for simplicity
const userTokens = {};

// Generate a unique token
function generateToken(ip) {
  return crypto.createHash('sha256').update(ip + Date.now().toString()).digest('hex');
}

// Endpoint to verify skip status
app.get('/verify', (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const token = req.query.token;
  const currentTime = Date.now();

  if (!userTokens[userIP] || userTokens[userIP].token !== token) {
    return res.status(403).json({ error: 'Ad skip required', redirect: true });
  }

  const { lastSkipped } = userTokens[userIP];
  if (currentTime - lastSkipped > 3 * 60 * 60 * 1000) { // 3 hours
    return res.status(403).json({ error: 'Ad expired, skip required', redirect: true });
  }

  return res.json({ success: true, message: 'Access granted' });
});

// Generate a skip ad URL
app.get('/skip-ad', (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const originalURL = req.query.redirect || '/';

  const token = generateToken(userIP);
  const adURL = `https://shortxlinks.com/st?api=af0701d2e65d26495fb8ee53c8b566b8640aea35&url=${encodeURIComponent(
    `https://your-backend-url.onrender.com/complete-skip?token=${token}&redirect=${originalURL}`
  )}`;

  userTokens[userIP] = { token, lastSkipped: null };
  res.json({ adURL });
});

// Handle skip completion
app.get('/complete-skip', (req, res) => {
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const { token, redirect } = req.query;

  if (!userTokens[userIP] || userTokens[userIP].token !== token) {
    return res.status(403).send('Invalid or expired token');
  }

  userTokens[userIP].lastSkipped = Date.now();
  res.redirect(redirect || '/');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
