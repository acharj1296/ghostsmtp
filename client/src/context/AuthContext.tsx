import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../api/firebase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor real firebase Auth state changes
  useEffect(() => {
    // Check if we are running in real Firebase mode vs mock bypass mode
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    if (isMock) {
      // Local storage mock token session restore
      const mockToken = localStorage.getItem('token');
      if (mockToken) {
        setUser({
          uid: 'mock-firebase-uid',
          email: localStorage.getItem('userEmail') || 'dev@ghostsmtp.com',
          displayName: 'GhostSMTP Developer',
          emailVerified: true,
        });
      }
      setLoading(false);
      return () => {};
    } else {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken(true); // Always refresh for token refresh handling
            localStorage.setItem('token', token);
            localStorage.setItem('userEmail', firebaseUser.email || '');
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              emailVerified: firebaseUser.emailVerified,
            });
          } catch (err) {
            console.error('Failed to get Firebase token:', err);
            setUser(null);
          }
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  const login = async (email?: string, password?: string) => {
    setLoading(true);
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        // Local developer mock authentication bypass
        localStorage.setItem('token', 'mock-developer-token');
        localStorage.setItem('userEmail', email || 'dev@ghostsmtp.com');
        setUser({
          uid: 'mock-firebase-uid',
          email: email || 'dev@ghostsmtp.com',
          displayName: 'GhostSMTP Developer',
          emailVerified: true,
        });
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required for authentication.');
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken(true);
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', userCredential.user.email || '');
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
          emailVerified: userCredential.user.emailVerified,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        // Local developer mock registration bypass
        localStorage.setItem('token', 'mock-developer-token');
        localStorage.setItem('userEmail', email);
        setUser({
          uid: 'mock-firebase-uid',
          email: email,
          displayName: displayName,
          emailVerified: false, // For testing email verification flow in mock mode
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await sendEmailVerification(userCredential.user);
        
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: displayName,
          emailVerified: userCredential.user.emailVerified,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        localStorage.setItem('token', 'mock-google-token');
        localStorage.setItem('userEmail', 'google-dev@ghostsmtp.com');
        setUser({
          uid: 'mock-google-uid',
          email: 'google-dev@ghostsmtp.com',
          displayName: 'Google Dev User',
          emailVerified: true,
        });
      } else {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const token = await userCredential.user.getIdToken(true);
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', userCredential.user.email || '');
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || 'Google User',
          emailVerified: userCredential.user.emailVerified,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        console.log(`[Mock Auth] Password reset email sent to: ${email}`);
      } else {
        await sendPasswordResetEmail(auth, email);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (!isMock) {
        await signOut(auth);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('activeWorkspaceId');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, loginWithGoogle, sendPasswordReset, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
export default AuthProvider;
