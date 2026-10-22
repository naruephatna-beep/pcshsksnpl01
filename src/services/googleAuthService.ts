import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const provider = new GoogleAuthProvider();
provider.addScope(GMAIL_SEND_SCOPE);
// Hint for school domain
provider.setCustomParameters({
  hd: 'pcshsksn.ac.th',
  prompt: 'select_account',
});

// Cache access token in memory (never in localStorage per security requirements)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

type AuthCallback = (user: User | null, token: string | null) => void;
const listeners: Set<AuthCallback> = new Set();

export const subscribeGoogleAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  callback(cachedUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(cachedUser, cachedAccessToken));
};

// Listen to auth state
onAuthStateChanged(auth, async (user) => {
  cachedUser = user;
  if (!user && !isSigningIn) {
    cachedAccessToken = null;
  }
  notifyListeners();
});

/**
 * Sign in with Google Workspace account to obtain Gmail API send permissions
 */
export async function signInWithGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถรับ Access Token จาก Google Workspace ได้');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Get current in-memory access token
 */
export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Get current Google user
 */
export function getCurrentGoogleUser(): User | null {
  return cachedUser;
}

/**
 * Sign out from Google Workspace
 */
export async function signOutGoogleWorkspace(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyListeners();
}

/**
 * Helper to build Base64Url RFC 2822 email message
 */
function createMimeMessage({
  to,
  from,
  subject,
  html,
}: {
  to: string;
  from?: string;
  subject: string;
  html: string;
}): string {
  // RFC 2047 UTF-8 subject header
  const encodedSubject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const headers = [
    `To: ${to}`,
    from ? `From: ${from}` : '',
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
  ].filter(Boolean);

  const rawMessage = headers.join('\r\n');

  // Convert to Base64URL
  return btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send real email through Google Workspace Gmail REST API
 */
export async function sendEmailViaGmailApi({
  to,
  subject,
  html,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}): Promise<{ success: boolean; messageId: string }> {
  let token = cachedAccessToken;

  if (!token) {
    // If not signed in yet, prompt sign-in popup
    const authResult = await signInWithGoogleWorkspace();
    token = authResult.accessToken;
  }

  const userEmail = cachedUser?.email || '';
  const fromHeader = fromName && userEmail ? `"${fromName}" <${userEmail}>` : userEmail;

  const raw = createMimeMessage({
    to,
    from: fromHeader,
    subject,
    html,
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || response.statusText;

    // If token expired, clear token and ask for re-auth
    if (response.status === 401) {
      cachedAccessToken = null;
      notifyListeners();
      throw new Error('เซสชันของ Google หมดอายุ กรุณากดเชื่อมต่อ Google Workspace ใหม่อีกครั้ง');
    }

    throw new Error(`ส่งอีเมลผ่าน Gmail ไม่สำเร็จ: ${errorMsg}`);
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}
