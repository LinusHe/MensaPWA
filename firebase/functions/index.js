/* eslint-disable indent */
// Deploy with: firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.checkNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();

    // Get all users whose nextNotification has passed
    const snapshot = await db.collection("notificationUsers")
      .where("nextNotification", "<=", now)
      .where("enabled", "==", true)
      .get();

    // For each user, send a notification and
    // update the nextNotification time
    for (const doc of snapshot.docs) {
      const user = doc.data();

      // Send a notification
      const message = {
        notification: {
          title: "Your notification title",
          body: "Your notification body",
        },
        token: user.fcm_token,
      };

      await admin.messaging().send(message);

      // Update the nextNotification time
      const nextNotification = getNextNotification(
        user.preferences.days,
        user.preferences.time,
      );
      await db.collection("notificationUsers").doc(user.userId).update({
        nextNotification: admin.firestore.Timestamp.fromDate(nextNotification),
      });
    }

    console.log("Notifications checked");
  });

const getNextNotification = (selectedDays, notificationTime) => {
  // Get current date
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Convert notification time to minutes
  const [hours, minutes] = notificationTime.split(":").map(Number);
  const notificationMinutes = hours * 60 + minutes;

  // Sort selected days
  const sortedDays = [...selectedDays].sort();

  // Find the next notification day
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];

    // If the current day is a selected day
    // and the notification time has not passed yet
    if (day == currentDay && currentTime < notificationMinutes) {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours, minutes,
      );
    }

    // If the current day is before a selected day
    if (day > currentDay) {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (day - currentDay),
        hours, minutes,
      );
    }
  }

  // If no day was found in this week, return the first day of the next week
  const nextDay = sortedDays[0];
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (7 - currentDay + nextDay),
    hours, minutes,
  );
};
