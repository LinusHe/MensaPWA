/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Notification Functions
 * Handles push notifications for users based on their preferences
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

/**
 * Scheduled function to check and send notifications
 * Runs every minute to check for users whose notification time has passed
 */
exports.checkNotifications = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "Europe/Berlin",
  region: process.env.FUNCTION_REGION || "europe-west3",
  memory: "256MiB",
  timeoutSeconds: 300,
  maxInstances: 1,
}, async (event) => {
  const now = moment().tz("Europe/Berlin").toDate();
  const db = admin.firestore();

  console.log("Current time: ", now);

  // Get all users whose nextNotification has passed
  const snapshot = await db.collection("notificationUsers")
    .where("nextNotification", "<=", now)
    .where("enabled", "==", true)
    .get();

  console.log("Fetched users whose notification time has passed:", snapshot.size);

  let { notification, menu } = await fetchNotificationAndMenu();

  if (!notification && !menu) {
    console.log("No notification and menu data available. Skipping notification sending.");
    await updateNextNotificationForAllUsers(db, now);
    return;
  }

  if (!notification) {
    notification = {
      title: "Check den Speiseplan aus!",
      body: "Die Mensa hat heute viele Leckereien für dich vorbereitet.",
    };
  }

  // For each user, send a notification and update the nextNotification time
  for (const doc of snapshot.docs) {
    const user = doc.data();
    console.log("Processing user: ", user.userId);

    // Send a notification
    try {
      await sendNotification(user, notification);
    } catch (err) {
      console.error("FCM send failed for user:", user.userId, err);
    }

    // Update the nextNotification time
    await updateNextNotification(db, user);
  }

  console.log("Notifications checked");
});

/**
 * Fetches notification and menu data from the data service
 * @return {Promise<{notification: {title: string, body: string}, menu: {}}>}
 */
async function fetchNotificationAndMenu() {
  const date = moment().tz("Europe/Berlin").format('YYYY-MM-DD');
  const base = process.env.DATA_BASE_URL || 'https://mensa.heylinus.de/data';
  const notificationUrl = `${base}/${date}/notification.json`;
  const menuUrl = `${base}/${date}/menu.json`;
  // Resolve data bucket: prefer env, otherwise use the project's default storage bucket
  const bucket = process.env.DATA_BUCKET || (admin.storage && admin.storage().bucket ? admin.storage().bucket().name : null);
  const notificationPath = `data/${date}/notification.json`;
  const menuPath = `data/${date}/menu.json`;
  let notification;
  let menu;

  try {
    notification = await fetchJsonFromCandidates([
      ...(bucket ? [
        // Prefer Storage URLs when a bucket is configured
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(notificationPath)}?alt=media`,
        `https://storage.googleapis.com/${bucket}/${notificationPath}`,
      ] : []),
      notificationUrl
    ]).then((data) => data?.notification);
  } catch (error) {
    console.error("Error fetching notification: ", error);
    notification = null;
  }

  try {
    menu = await fetchJsonFromCandidates([
      ...(bucket ? [
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(menuPath)}?alt=media`,
        `https://storage.googleapis.com/${bucket}/${menuPath}`,
      ] : []),
      menuUrl
    ]);
  } catch (error) {
    console.error("Error fetching menu: ", error);
    menu = null;
  }

  return { notification, menu };
}

/**
 * Fetch with timeout and single retry for transient failures
 */
async function fetchWithTimeout(url, { timeoutMs = 8000, retry = 1, init = {} } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err) {
    if (retry > 0) {
      await new Promise(r => setTimeout(r, 500));
      return fetchWithTimeout(url, { timeoutMs, retry: retry - 1, init });
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Try to fetch JSON from a list of candidate URLs (first success wins)
 */
async function fetchJsonFromCandidates(urls) {
  let lastError;
  for (const u of urls) {
    try {
      const res = await fetchWithTimeout(u, { timeoutMs: 8000 });
      if (!res.ok) throw new Error(`${u} HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`${u} is not valid JSON`);
      }
    } catch (e) {
      lastError = e;
      console.warn('Fetch candidate failed:', e.message);
      continue;
    }
  }
  throw lastError || new Error('No URLs provided');
}

/**
 * Sends a push notification to a user
 * @param {*} user User object with fcm_token
 * @param {*} notification Notification object with title and body
 */
async function sendNotification(user, notification) {
  const message = {
    token: user.fcm_token,
    data: {
      title: notification.title,
      body: notification.body,
      link: '/menu',
    },
    webpush: {
      fcm_options: {
        link: '/menu',
      },
    },
  };

  return admin.messaging().send(message);
}

/**
 * Updates the next notification time for a specific user
 * @param {*} db Firestore database instance
 * @param {*} user User object with preferences
 */
async function updateNextNotification(db, user) {
  const nextNotification = getNextNotification(
    user.preferences.days,
    user.preferences.time,
  );
  await db.collection("notificationUsers").doc(user.userId).update({
    nextNotification: admin.firestore.Timestamp.fromDate(nextNotification),
  });

  console.log("Updated nextNotification time for user: ", user.userId, " to: ", nextNotification);
}

/**
 * Updates next notification time for all users whose time has passed
 * @param {*} db Firestore database instance
 * @param {*} now Current date/time
 */
async function updateNextNotificationForAllUsers(db, now) {
  const snapshot = await db.collection("notificationUsers")
    .where("nextNotification", "<=", now)
    .where("enabled", "==", true)
    .get();

  for (const doc of snapshot.docs) {
    const user = doc.data();
    await updateNextNotification(db, user);
  }
}

/**
 * Calculates the next notification time based on user preferences
 * @param {*} selectedDays Array of selected days (0-6, Sunday = 0)
 * @param {*} notificationTime Time string in HH:MM format
 * @return {Date} Next notification date/time
 */
const getNextNotification = (selectedDays, notificationTime) => {
  console.log("Calculating next notification time...");

  // Get current date and time
  const now = moment().tz("Europe/Berlin");

  // Convert notification time to minutes
  if (!Array.isArray(selectedDays) || selectedDays.length === 0 || typeof notificationTime !== 'string') {
    // Default: notify next weekday at 09:00
    selectedDays = [1, 2, 3, 4, 5];
    notificationTime = '09:00';
  }

  const [hours, minutes] = notificationTime.split(":").map(Number);
  const notificationMinutes = hours * 60 + minutes;

  console.log("Notification time in minutes: ", notificationMinutes);

  // Normalize and sort selected days
  const sortedDays = [...selectedDays].map((d) => parseInt(d, 10)).sort();

  console.log("Sorted days: ", sortedDays);

  // Find the next notification day
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];

    // Create a moment object for the next notification day
    const nextNotificationDay = now.clone().day(day).hour(hours).minute(minutes);

    // If the next notification day is in the future, return it
    if (nextNotificationDay.isAfter(now)) {
      console.log("Next notification: ", nextNotificationDay.toDate());
      return nextNotificationDay.toDate();
    }
  }

  // If no day was found in this week, return the first day of the next week
  console.log("No day was found in this week, return same day next week");
  const nextDay = sortedDays[0];
  const nextNotificationDay = now.clone().add(1, 'weeks').day(nextDay).hour(hours).minute(minutes);

  console.log("Next notification: ", nextNotificationDay.toDate());
  return nextNotificationDay.toDate();
};
