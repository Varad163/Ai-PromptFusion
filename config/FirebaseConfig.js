// config/FirebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ✅ Don't import `getAnalytics` globally — it must run only in browser

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "ai-fusion-models.firebaseapp.com",
  projectId: "ai-fusion-models",
  storageBucket: "ai-fusion-models.firebasestorage.app",
  messagingSenderId: "215629515321",
  appId: "1:215629515321:web:3215451e8884a7b7195be8",
  measurementId: "G-MHTEDFV9BW",
};

// ✅ Initialize Firebase once
const app = initializeApp(firebaseConfig);

// ✅ Firestore (works on server and client)
export const db = getFirestore(app);

// ✅ Optional analytics initializer (client-only)
export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    const { getAnalytics } = await import("firebase/analytics");
    return getAnalytics(app);
  }
  return null;
};
