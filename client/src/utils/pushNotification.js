import { getMessaging, getToken } from "firebase/messaging";


// Initialize Firebase Cloud Messaging and get a reference to the service
export function requestPermissionAndToken() {
  console.log("Requesting permission...");
  return new Promise((resolve, reject) => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted.");
          const messaging = getMessaging();
          getToken(messaging, {
            vapidKey:
              "BO97pJvV_Pf3hwpuMaJqysXOBrXdws_9W93tDRy9WupWkKgIWOxYV3qU0BB4YB50AFsOszzN7HcRP4fHNA_Ib0o",
          }).then((currentToken) => {
            if (currentToken) {
              resolve(currentToken);
            } else {
              reject({ message: "VapidKey Token konnte nicht generiert werden.", type: "error" });
            }
          });
        } else {
          reject({ message: "Berechtigung für Benachrichtigungen wurden nicht erteilt. Bitte erteile dieser App die Berechtigung, Benachrichtigungen zu empfangen.", type: "error" });
        }
      });
    }
    else if (window.navigator.standalone === false) {
      reject({ message: "Die App ist auf iOS nicht als PWA installiert. Bitte installiere die App als PWA und aktiviere anschließend die Benachrichtigungen.", type: "info", buttonText: "Installieren", buttonAction: "installPWA" });
    }
    else {
      reject({ message: "Benachrichtigungen sind in diesem Browser aufgrund von unsicherer HTTP-Verbindung nicht verfügbar. Versuche die Seite per HTTPS Verbindung aufzurufen, oder kontaktiere uns.", type: "error" });
    }
  });
}
