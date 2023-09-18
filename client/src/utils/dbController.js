import { getFirestore, doc, setDoc } from "firebase/firestore";

export function updateUserData(userId, token, selectedDays, notificationTime) {
  const db = getFirestore();
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = doc(db, "notificationUsers", userId);
      await setDoc(userRef, {
        fcm_token: token,
        preferences: {
          // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
          days: selectedDays,
          time: notificationTime
        }
      }, { merge: true });
      console.log("Document written with Data: ", { userId, token, selectedDays, notificationTime });
      resolve();
    } catch (e) {
      console.error("Error adding document: ", e);
      reject(e);
    }
  });
}
