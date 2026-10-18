import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    const proc = (globalThis as any)?.process;
    if (proc?.env && proc.env[key]) {
      return proc.env[key];
    }
  } catch {}
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Determine if valid production Firebase config is present
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'your_api_key_here' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'your_project_id'
  );
};

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.info('Connected to Firebase Live Backend');
  } catch (error) {
    console.warn('Firebase initialization skipped or failed:', error);
  }
} else {
  console.info('Running in Local Persistent Storage Mode (Configure .env with Firebase credentials for Cloud Firestore)');
}

export const getFirebaseAuth = (): Auth | null => {
  if (!auth && isFirebaseConfigured()) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      auth = getAuth(app);
    } catch (e) {
      console.warn('Failed to initialize Firebase Auth:', e);
    }
  }
  return auth;
};

export { app, auth, db, storage };
