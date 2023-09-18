import { getFirestore, doc, setDoc } from "firebase/firestore";

const getNextNotification = (selectedDays, notificationTime) => {
  // Get current date
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Convert notification time to minutes
  const [hours, minutes] = notificationTime.split(':').map(Number);
  const notificationMinutes = hours * 60 + minutes;

  // Sort selected days
  const sortedDays = [...selectedDays].sort();

  // Find the next notification day
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];

    // If the current day is a selected day and the notification time has not passed yet
    if (day == currentDay && currentTime < notificationMinutes) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }

    // If the current day is before a selected day
    if (day > currentDay) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (day - currentDay), hours, minutes);
    }
  }

  // If no day was found in this week, return the first day of the next week
  const nextDay = sortedDays[0];
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - currentDay + nextDay), hours, minutes);
}

export function updateUserData(userId, token, selectedDays, notificationTime) {
  const db = getFirestore();
  const nextNotification = getNextNotification(selectedDays, notificationTime);
  const data = {
    enabled: true,
    userId: userId,
    fcm_token: token,
    nextNotification: nextNotification,
    preferences: {
      // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      days: selectedDays,
      time: notificationTime
    }
  };
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = doc(db, "notificationUsers", userId);
      await setDoc(userRef, data, { merge: true });
      console.log("Document written with Data: ", data);
      resolve();
    } catch (e) {
      console.error("Error adding document: ", e);
      // reject(e);
    }
  });
}

export async function disableNotification(userId) {
  const db = getFirestore();
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = doc(db, "notificationUsers", userId);
      await setDoc(userRef, {
        enabled: false,
        userId: userId,
      }, { merge: true });
      console.log("Disabled Notifications for User: ", { userId });
      resolve();
    } catch (e) {
      console.error("Error adding document: ", e);
      // reject(e);
    }
  });
}
