import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (Analytics excluded)
const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_WEB_API_KEY",
  authDomain: "prince-driving-school.firebaseapp.com",
  projectId: "prince-driving-school",
  storageBucket: "prince-driving-school.firebasestorage.app",
  messagingSenderId: "30301758705",
  appId: "1:30301758705:web:7cecbc7eb604040bbc7550"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Cloud Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
