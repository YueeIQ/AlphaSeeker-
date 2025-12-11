import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgi6vaImXLXRmbccSKn1srfVkfqnSwpDc",
  authDomain: "alphaseeker-db.firebaseapp.com",
  projectId: "alphaseeker-db",
  storageBucket: "alphaseeker-db.firebasestorage.app",
  messagingSenderId: "399843180472",
  appId: "1:399843180472:web:8c5ca1912a8f43c41e994d",
  measurementId: "G-QFCVJJW1C9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);