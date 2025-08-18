/* eslint-disable indent, max-len, quotes, object-curly-spacing */
// Main entry point for Firebase Functions v2
// Deploy with: firebase deploy --only functions

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");

// Initialize Firebase Admin
admin.initializeApp();
console.log("Firebase Admin Initialized");

// Import function modules  
const notifications = require('./src/notifications');
const dataGeneration = require('./src/dataGeneration');

// Export notification-related functions
exports.checkNotifications = notifications.checkNotifications;

// Export data generation functions
exports.generateDailyData = dataGeneration.generateDailyData;

// Health check endpoint (v2)
exports.healthCheck = onRequest({
  region: process.env.FUNCTION_REGION || 'europe-west3',
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: true,
}, (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: ['checkNotifications', 'getCacheStats'],
    version: '2.0.0-enhanced-cache-v2'
  });
});

// Cache management endpoint (v2)
exports.getCacheStats = onRequest({
  region: process.env.FUNCTION_REGION || 'europe-west3',
  memory: '512MiB',
  timeoutSeconds: 60,
  cors: true,
}, async (req, res) => {
  try {
    // Simple API key check for protection
    const apiKey = process.env.ADMIN_API_KEY;
    if (!apiKey || req.headers['x-api-key'] !== apiKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const EnhancedImageCache = require('./src/enhancedCache');
    const imageCache = new EnhancedImageCache();
    const stats = await imageCache.getCacheStats();

    res.status(200).json({
      success: true,
      cacheStats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
