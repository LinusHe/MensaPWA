/* eslint-disable indent, max-len, quotes, object-curly-spacing */
// Deploy with: firebase deploy --only functions
const moment = require("moment-timezone");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

console.log("Firebase Admin Initialized");

exports.checkNotifications = functions.pubsub.schedule("every 1 minutes").onRun(async (context) => {
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

  // For each user, send a notification and
  // update the nextNotification time
  for (const doc of snapshot.docs) {
    const user = doc.data();

    console.log("Processing user: ", user.userId);

    // Send a notification
    await sendNotification(user, notification);

    // Update the nextNotification time
    await updateNextNotification(db, user);
  }

  console.log("Notifications checked");
});

/**
 *
 * @return {Promise<{notification: {title: string, body: string}, menu: {}}>}
 */
async function fetchNotificationAndMenu() {
  // Fetch the notification message
  const date = moment().tz("Europe/Berlin").format('YYYY-MM-DD');
  const notificationUrl = `https://mensa.heylinus.de/data/${date}/notification.json`;
  const menuUrl = `https://mensa.heylinus.de/data/${date}/menu.json`;
  let notification;
  let menu;

  try {
    const response = await fetch(notificationUrl);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      notification = data.notification;
    } else {
      throw new Error("notification.json does not exist");
    }
  } catch (error) {
    console.error("Error fetching notification: ", error);
    notification = null;
  }

  try {
    const response = await fetch(menuUrl);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      menu = await response.json();
    } else {
      throw new Error("menu.json does not exist");
    }
  } catch (error) {
    console.error("Error fetching menu: ", error);
    menu = null;
  }

  return { notification, menu };
}

/**
 *
 * @param {*} user
 * @param {*} notification
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

  admin.messaging().send(message).then((response) => {
    console.log("Notification sent to userId: ", user.userId);
    console.log("Notification message: ", message);
    console.log("Notification response: ", response);
  }).catch((error) => {
    console.log("Error sending notification to userId: ", user.userId, ". Error: ", error);
  });
}

/**
 *
 * @param {*} db
 * @param {*} user
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
 *
 * @param {*} db
 * @param {*} now
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
 *
 * @param {*} selectedDays
 * @param {*} notificationTime
 * @return {Date}
 */
const getNextNotification = (selectedDays, notificationTime) => {
  console.log("Calculating next notification time...");

  // Get current date and time
  const now = moment().tz("Europe/Berlin");

  // Convert notification time to minutes
  const [hours, minutes] = notificationTime.split(":").map(Number);
  const notificationMinutes = hours * 60 + minutes;

  console.log("Notification time in minutes: ", notificationMinutes);

  // Sort selected days
  const sortedDays = [...selectedDays].sort();

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
