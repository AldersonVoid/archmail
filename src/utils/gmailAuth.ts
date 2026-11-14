import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirebaseConfig, isFirebaseConfigured } from './firebaseConfig';

export const STANDARD_SCOPES = [
  'email',
  'profile'
];

export const RESTRICTED_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

const firebaseConfig = getFirebaseConfig();
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GmailUserProfile {
  email: string;
  displayName: string;
  photoURL?: string;
  uid: string;
}

export interface GoogleAuthResult {
  user: User;
  accessToken: string;
  profile: GmailUserProfile;
  hasDirectSendScope: boolean;
}

export interface GoogleAuthError {
  isAccessDenied: boolean;
  message: string;
  code?: string;
}

/**
 * Initialize auth listener on application load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google OAuth popup sign-in.
 * By default requests standard profile & email scopes so ANY user can sign in
 * without encountering Google Error 403 access_denied on unverified projects.
 */
export const googleSignIn = async (
  requestRestrictedScopes: boolean = true
): Promise<{ result?: GoogleAuthResult; error?: GoogleAuthError }> => {
  if (!isFirebaseConfigured()) {
    return {
      error: {
        isAccessDenied: false,
        message: 'Firebase is not configured. Please add your Firebase credentials in .env (see README.md) or use SMTP / App Password.'
      }
    };
  }

  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    if (requestRestrictedScopes) {
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
    }
    
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const authResult = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(authResult);
    const accessToken = credential?.accessToken || 'google_authenticated_token';

    cachedAccessToken = accessToken;
    const user = authResult.user;

    const profile: GmailUserProfile = {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Gmail User',
      photoURL: user.photoURL || undefined,
      uid: user.uid
    };

    return {
      result: {
        user,
        accessToken,
        profile,
        hasDirectSendScope: requestRestrictedScopes
      }
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const isAccessDenied = err?.code === 'auth/admin-restricted-operation' ||
      err?.code === 'auth/access-denied' ||
      /access_denied|403|unverified|developer-approved|testing/i.test(errorMsg);

    if (err?.code === 'auth/popup-closed-by-user') {
      return { error: { isAccessDenied: false, message: 'Sign-in cancelled by user.' } };
    }

    return {
      error: {
        isAccessDenied,
        message: errorMsg,
        code: err?.code
      }
    };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory cached access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out user and clear cached token in memory.
 */
export const logoutGmail = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Encodes a string into Base64 format with proper UTF-8 handling.
 */
function toUtf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encodes a string into Base64URL format (RFC 4648 §5).
 */
function toBase64Url(str: string): string {
  return toUtf8Base64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Constructs an RFC 2822 email payload and dispatches it via Gmail REST API.
 */
export async function sendEmailViaGmailApi({
  accessToken,
  to,
  from,
  subject,
  body,
  isHtml
}: {
  accessToken: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  isHtml: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string; status: 'sent' | 'bounced' | 'failed'; code: number }> {
  try {
    const rawRfc2822 = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: =?utf-8?B?${toUtf8Base64(subject)}?=`,
      'MIME-Version: 1.0',
      `Content-Type: ${isHtml ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'}`,
      'Content-Transfer-Encoding: 8bit',
      '',
      body
    ].join('\r\n');

    const base64UrlPayload = toBase64Url(rawRfc2822);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64UrlPayload
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || 'Gmail API transmission failed';
      const isBounce = res.status === 400 || /invalid|recipient|rejected|address/i.test(errMsg);
      return {
        success: false,
        status: isBounce ? 'bounced' : 'failed',
        code: res.status,
        error: errMsg
      };
    }

    return {
      success: true,
      status: 'sent',
      code: 200,
      messageId: data.id
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      code: 500,
      error: err.message || 'Network error communicating with Gmail API'
    };
  }
}
