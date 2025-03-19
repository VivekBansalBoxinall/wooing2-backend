// import admin from "firebase-admin";
// import serviceAccount from "./firebase-credentials.json";

// // Initialize Firebase Admin SDK
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse the credentials file
const serviceAccountPath = path.join(__dirname, "firebase-credentials.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send push notification to device
 * @param {Object} options
 * @param {string} options.token - Device token
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Additional data to send
 * @returns {Promise}
 */
export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
    // Prepare the message for FCM
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        callData:
          typeof data.callData === "object"
            ? JSON.stringify(data.callData)
            : data.callData,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "calls",
          priority: "max",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            category: "CALL",
            sound: "default",
          },
        },
      },
    };

    // Send the notification through FCM
    const response = await admin.messaging().send(message);
    console.log("Successfully sent notification:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};
