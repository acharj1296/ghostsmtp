import * as admin from 'firebase-admin';
import { env } from './env';

let firebaseAdminApp: admin.app.App | null = null;

try {
  // Replace escape sequences in private key if loaded from environment string
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  console.log('[Firebase Admin] Initialized successfully.');
} catch (error: any) {
  console.warn('[Firebase Admin WARNING] Could not initialize Firebase Admin SDK. Auth middleware will fallback to mock verification in development.', error.message);
}

export const firebaseAdmin = firebaseAdminApp;
export const auth = firebaseAdminApp ? firebaseAdminApp.auth() : null;
