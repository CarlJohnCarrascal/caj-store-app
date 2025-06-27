
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

let firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A flag to check if the config is valid
export let isFirebaseConfigured = true;

// Check if essential environment variables are set
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.databaseURL ||
  !firebaseConfig.projectId
) {
  isFirebaseConfigured = false;
  
  // Use placeholder values to prevent app crash during initialization
  firebaseConfig = {
    apiKey: "placeholder-api-key",
    authDomain: "placeholder.firebaseapp.com",
    databaseURL: "https://placeholder.firebaseio.com",
    projectId: "placeholder-project-id",
    storageBucket: "placeholder.appspot.com",
    messagingSenderId: "placeholder-sender-id",
    appId: "placeholder-app-id",
  };
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth };
