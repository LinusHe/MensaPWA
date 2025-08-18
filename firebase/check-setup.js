#!/usr/bin/env node
/**
 * Script to check Firebase project setup
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin without credentials for local check
try {
  // This will fail but show us the project info
  admin.initializeApp({
    projectId: 'mensapwa-39cd9'
  });
  
  console.log('🎯 Firebase Project Info:');
  console.log(`Project ID: mensapwa-39cd9`);
  console.log(`Default bucket: mensapwa-39cd9.appspot.com`);
  console.log(`Alt bucket: mensapwa-39cd9.firebasestorage.app`);
  console.log('');
  console.log('✅ Check Firebase Console to confirm Storage is enabled');
  console.log('📍 https://console.firebase.google.com/project/mensapwa-39cd9/storage');
  
} catch (error) {
  console.log('ℹ️  This is expected - we just need the project info');
  console.log(`🎯 Your bucket name will be one of:`);
  console.log(`   • mensapwa-39cd9.appspot.com`);
  console.log(`   • mensapwa-39cd9.firebasestorage.app`);
}
