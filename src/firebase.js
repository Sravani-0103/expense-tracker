// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableNetwork, enableIndexedDbPersistence } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfJ4cIozjgJRHKPdmhTwfrhGUM4PLobb0",
  authDomain: "expense-tracker-ceeb6.firebaseapp.com",
  projectId: "expense-tracker-ceeb6",
  storageBucket: "expense-tracker-ceeb6.firebasestorage.app",
  messagingSenderId: "437296946403",
  appId: "1:437296946403:web:3280bcf66567f0e5e5b9d6",
  measurementId: "G-NFHXL1DN5P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize messaging (for notifications)
export const messaging = getMessaging(app);

// Enable offline persistence
try {
  await enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
}

export default app;