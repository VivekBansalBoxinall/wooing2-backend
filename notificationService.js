// import admin from "firebase-admin";
// import serviceAccount from "./firebase-credentials.json";

// // Initialize Firebase Admin SDK
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

const credentials = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(credentials),
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
