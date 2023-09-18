/* eslint-disable indent, max-len, quotes */
// Deploy with: firebase deploy --only functions
const moment = require("moment-timezone");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

console.log("Firebase Admin Initialized");

exports.checkNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    console.log("Checking notifications...");

    const now = moment().tz("Europe/Berlin").toDate();
    const db = admin.firestore();

    console.log("Current time: ", now);

    // Fetch the notification message
    const date = moment().tz("Europe/Berlin").format('YYYY-MM-DD');
    const url = `https://mensa.heylinus.de/data/${date}/notification.json`;
    let notification;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      notification = data.notification;
      console.log("Fetched notification: ", notification);
    } catch (error) {
      console.error("Error fetching notification: ", error);
      // Set a default notification message
      notification = {
        title: "Check den Speiseplan aus!",
        body: "Die Mensa hat heute viele Leckereien für dich vorbereitet.",
      };
    }

    // Get all users whose nextNotification has passed
    const snapshot = await db.collection("notificationUsers")
      .where("nextNotification", "<=", now)
      .where("enabled", "==", true)
      .get();

    console.log("Fetched users: ", snapshot.size);

    // For each user, send a notification and
    // update the nextNotification time
    for (const doc of snapshot.docs) {
      const user = doc.data();

      console.log("Processing user: ", user.userId);

      // Send a notification
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
        console.log("Notification sent to user: ", user.userId);
        console.log("Benachrichtigung gesendet:", response);
      }).catch((error) => {
        console.log("Fehler beim Senden der Benachrichtigung:", error);
      });


      // Update the nextNotification time
      const nextNotification = getNextNotification(
        user.preferences.days,
        user.preferences.time,
      );
      await db.collection("notificationUsers").doc(user.userId).update({
        nextNotification: admin.firestore.Timestamp.fromDate(nextNotification),
      });

      console.log("Updated nextNotification time for user: ", user.userId, " to: ", nextNotification);
    }

    console.log("Notifications checked");
  });

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

    console.log("Processing day: ", day);

    // Create a moment object for the next notification day
    const nextNotificationDay = now.clone().day(day).hour(hours).minute(minutes);

    // If the next notification day is in the future, return it
    if (nextNotificationDay.isAfter(now)) {
      console.log("Next notification day: ", nextNotificationDay.format());
      return nextNotificationDay.toDate();
    }
  }

  // If no day was found in this week, return the first day of the next week
  console.log("No day was found in this week, return 1st day of the next week");
  const nextDay = sortedDays[0];
  const nextNotificationDay = now.clone().add(1, 'weeks').day(nextDay).hour(hours).minute(minutes);

  console.log("Next notification day: ", nextNotificationDay.format());
  return nextNotificationDay.toDate();
};
