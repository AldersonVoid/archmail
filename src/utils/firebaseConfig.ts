export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

const DEFAULT_PLACEHOLDER_CONFIG: FirebaseConfig = {
  projectId: "your-firebase-project-id",
  appId: "1:000000000000:web:0000000000000000000000",
  apiKey: "AIzaSy_YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "your-firebase-project-id.firebaseapp.com",
  storageBucket: "your-firebase-project-id.firebasestorage.app",
  messagingSenderId: "000000000000",
  measurementId: "G-XXXXXXXXXX"
};

/**
 * Resolves the Firebase configuration in priority order:
 * 1. Global window.__FIREBASE_CONFIG__ (for runtime injection in production/hosted environments)
 * 2. Vite environment variables (VITE_FIREBASE_*)
 * 3. Default placeholder config (allows app to compile and run in local dev without errors)
 */
export const getFirebaseConfig = (): FirebaseConfig => {
  if (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) {
    return (window as any).__FIREBASE_CONFIG__;
  }

  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    return {
      projectId: envProjectId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
    };
  }

  return DEFAULT_PLACEHOLDER_CONFIG;
};

/**
 * Checks whether valid Firebase credentials have been configured.
 */
export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
    !config.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
    !config.apiKey.includes('PLACEHOLDER') &&
    config.projectId &&
    !config.projectId.includes('your-firebase-project-id')
  );
};
