const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push');

const app = express();
app.use(express.json());

mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/mydatabase', { useNewUrlParser: true });

const subscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  }
});
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Endpunkt zum Speichern der Abonnements
app.post('/subscribe', async (req, res) => {
  const subscription = new Subscription(req.body);
  await subscription.save();
  res.status(201).json({ message: 'Subscribed' });
});

// Endpunkt zum Auslösen der Benachrichtigungen (normalerweise durch einen Cron-Job oder ähnliches getriggert)
app.post('/send', async (req, res) => {
  const allSubscriptions = await Subscription.find({});
  const payload = JSON.stringify({ title: 'New Notification' });

  allSubscriptions.forEach((sub) => {
    webpush.sendNotification(sub, payload).catch((error) => console.error(error));
  });

  res.status(200).json({ message: 'Notification sent' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
