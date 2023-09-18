// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js");

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
  apiKey: "AIzaSyD5aT5GwndtWGX8wJ4izKUIoW7zixOvydk",
  authDomain: "mensapwa-39cd9.firebaseapp.com",
  projectId: "mensapwa-39cd9",
  storageBucket: "mensapwa-39cd9.appspot.com",
  messagingSenderId: "501729068545",
  appId: "1:501729068545:web:e8f6c4cb184c83ea40a200"
};

console.log("Firebase config: ", firebaseConfig);

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.data.body,
    // more options, like icons, etc.
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  // Prevent the browser from focusing the Notification's tab.
  event.notification.close();

  // Get the link from the notification data
  const urlToOpen = new URL(event.notification.data.link, self.location.origin).href;

  // Check if the current is open and focus if it is
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then( windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If we don't find an existing tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
