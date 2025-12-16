require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('public'));     

// Initialize FCM
let initialized = false;
try {
  // Method 1: Initialize with JSON file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    initialized = true;
    console.log('✅ FCM initialized successfully (using JSON file path)');
  }
  // Method 2: Initialize from service account JSON in environment variable
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log('✅ FCM initialized successfully (using environment variable JSON)');
  }
  // Method 3: Initialize with individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
    initialized = true;
    console.log('✅ FCM initialized successfully (using individual environment variables)');
  } else {
    console.warn('⚠️  FCM initialization failed: Please check your environment variables.');
  }
} catch (error) {
  console.error('❌ FCM initialization error:', error.message);
}

// Default push message JSON template
const defaultPushMessage = {
  notification: {
    title: 'Test Notification',
    body: 'This is a push message test.',
  },
  data: {
    timestamp: new Date().toISOString(),
    msg: 'put any data you want to send'
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'default',
    },
  },
  apns: {
    headers : {
      'apns-priority': '10',
    },
    payload: {
      aps: {
        'content-available': 1,
        alert: {
          title: 'Test Notification',
          body: 'This is a push message test.',
        },
        sound: 'default',
      },
    },
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    fcmInitialized: initialized,
    timestamp: new Date().toISOString(),
  });
});

// Default message template endpoint
app.get('/message-template', (req, res) => {
  res.json(defaultPushMessage);
});

// Push message sending endpoint
app.post('/push', async (req, res) => {
  if (!initialized) {
    return res.status(500).json({
      success: false,
      error: 'FCM is not initialized. Please check your environment variables.',
    });
  }

  const { tokens, messagesPerToken } = req.body;

  if (!tokens) {
    return res.status(400).json({
      success: false,
      error: 'tokens array is required.',
    });
  }

  // Validate tokens is an array
  if (!Array.isArray(tokens)) {
    return res.status(400).json({
      success: false,
      error: 'tokens must be an array.',
    });
  }

  // Check for empty array
  if (tokens.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'tokens array is empty.',
    });
  }

  // Validate messagesPerToken
  const MESSAGES_PER_TOKEN = messagesPerToken && messagesPerToken > 0 && messagesPerToken <= 100 
    ? parseInt(messagesPerToken) 
    : 10;

  try {
    let message;
    
    // Use custom message if provided, otherwise use default message
    if (req.body.message && typeof req.body.message === 'object') {
      // Use custom message (exclude tokens from merge)
      const { tokens: _, ...customMessage } = req.body.message;
      message = {
        ...defaultPushMessage,
        ...customMessage,
      };
    } else {
      // Use default message
      message = {
        ...defaultPushMessage,
      };
    }

    // Send specified number of messages for each token simultaneously (parallel processing)
    const sendPromises = tokens.flatMap(token => {
      // Create promises for sending messages to each token
      return Array.from({ length: MESSAGES_PER_TOKEN }, (_, index) => {
        const messageWithToken = {
          ...message,
          token: token,
        };
        
        return admin.messaging().send(messageWithToken)
          .then(messageId => ({
            token: token,
            messageIndex: index + 1,
            success: true,
            messageId: messageId,
            error: null,
          }))
          .catch(error => ({
            token: token,
            messageIndex: index + 1,
            success: false,
            messageId: null,
            error: {
              code: error.code || 'unknown',
              message: error.message || 'Unknown error',
            },
          }));
      });
    });

    // Wait for all requests to complete
    const results = await Promise.all(sendPromises);

    // Calculate success/failure counts
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalMessages = tokens.length * MESSAGES_PER_TOKEN;
    
    console.log('✅ Push messages sent successfully:', {
      successCount: successCount,
      failureCount: failureCount,
      totalTokens: tokens.length,
      messagesPerToken: MESSAGES_PER_TOKEN,
      totalMessages: totalMessages,
    });

    res.json({
      success: true,
      summary: {
        totalTokens: tokens.length,
        messagesPerToken: MESSAGES_PER_TOKEN,
        totalMessages: totalMessages,
        successCount: successCount,
        failureCount: failureCount,
      },
      results: results,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to send push messages:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// Serve web page at root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 Web page: http://localhost:${PORT}/`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Push endpoint: http://localhost:${PORT}/push`);
});

