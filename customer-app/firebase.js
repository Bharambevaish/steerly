import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_WEB_API_KEY",
  authDomain: "prince-driving-school.firebaseapp.com",
  projectId: "prince-driving-school",
  storageBucket: "prince-driving-school.firebasestorage.app",
  messagingSenderId: "30301758705",
  appId: "1:30301758705:web:7cecbc7eb604040bbc7550"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export default app;
