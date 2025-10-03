// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import {getFirestore} from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "ai-fusion-models.firebaseapp.com",
  projectId: "ai-fusion-models",
  storageBucket: "ai-fusion-models.firebasestorage.app",
  messagingSenderId: "215629515321",
  appId: "1:215629515321:web:3215451e8884a7b7195be8",
  measurementId: "G-MHTEDFV9BW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db=getFirestore(app)