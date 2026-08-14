import admin from "firebase-admin";
import { config } from "../config/env.js";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: config.firebasePrivateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export const firebaseAuth = admin.auth();
