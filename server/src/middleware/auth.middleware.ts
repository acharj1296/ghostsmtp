import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { UserRepository } from '../repositories/user.repository';

// Express Request custom property declarations
declare global {
  namespace Express {
    interface Request {
      user?: any; // IUser type
      workspaceId?: string;
    }
  }
}

const userRepository = new UserRepository();

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    let decodedToken;

    if (auth) {
      // Verify Firebase ID Token
      decodedToken = await auth.verifyIdToken(idToken);
    } else {
      // If Firebase Admin failed to initialize (e.g. mock mode in local test/dev)
      // Allow fallback if NODE_ENV is development for local verification checks
      if (process.env.NODE_ENV === 'development') {
        decodedToken = { uid: 'mock-firebase-uid', email: 'dev@ghostsmtp.com' };
        console.log('[Auth Middleware] Using developer mock token verification fallback.');
      } else {
        return res.status(500).json({ error: 'Firebase Auth is uninitialized in production.' });
      }
    }

    // Resolve user from DB
    let user = await userRepository.findByFirebaseUid((decodedToken as any).uid);

    // Auto-create user profile from Firebase token info if missing in DB
    if (!user) {
      user = await userRepository.create({
        firebaseUid: (decodedToken as any).uid,
        email: (decodedToken as any).email || '',
        name: (decodedToken as any).name || (decodedToken as any).email?.split('@')[0] || 'SMTP User',
        workspaces: [],
        active: true,
      } as any);
    }

    req.user = user;

    // Tenant Isolation Check (X-Workspace-ID header)
    const workspaceIdHeader = req.headers['x-workspace-id'];
    if (workspaceIdHeader && typeof workspaceIdHeader === 'string') {
      const isMember = user.workspaces.some(
        (w) => w.workspaceId.toString() === workspaceIdHeader
      );
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden. User does not have access to this workspace.' });
      }
      req.workspaceId = workspaceIdHeader;
    }

    next();
  } catch (error: any) {
    console.error('[Auth Middleware Error]:', error.message);
    return res.status(401).json({ error: 'Invalid or expired Authorization token.' });
  }
};
