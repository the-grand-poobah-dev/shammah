'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app instance if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export default app;

// Per-service scopes mapped to the exact endpoints called in GoogleWorkspaceHubView.js
export const WORKSPACE_TAB_SCOPES = {
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
  ],
  keep: [
    'https://www.googleapis.com/auth/keep',
  ],
  meet: [
    'https://www.googleapis.com/auth/meetings.space.created',
  ],
  classroom: [
    'https://www.googleapis.com/auth/classroom.courses',
    'https://www.googleapis.com/auth/classroom.announcements',
  ],
  tasks: [
    'https://www.googleapis.com/auth/tasks',
  ],
  chat: [
    'https://www.googleapis.com/auth/chat.spaces.readonly',
    'https://www.googleapis.com/auth/chat.messages',
  ],
  slides: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/presentations',
  ],
  forms: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
  ],
  firebase: [],
};

// Trimmed Google Workspace OAuth scopes (only the 13 scopes actually used by live hub features, down from 84)
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/keep',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.announcements',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
];

function createGoogleProvider(requestedScopes = SCOPES) {
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    include_granted_scopes: 'true',
  });
  const list = Array.isArray(requestedScopes) && requestedScopes.length > 0 ? requestedScopes : SCOPES;
  list.forEach((scope) => googleProvider.addScope(scope));
  return googleProvider;
}

// In-memory access token cache (never stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken = null;
let connectionTested = false;

// Validate connection to Firestore on boot
export async function testFirestoreConnection() {
  if (typeof window === 'undefined' || connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const testConnection = testFirestoreConnection;

export function subscribeToFirebaseAuth(callback) {
  if (typeof window === 'undefined') return () => {};
  return onAuthStateChanged(auth, (user) => {
    if (callback) callback(user);
  });
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize auth state listener
export const initAuth = (onAuthSuccess, onAuthFailure) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const googleSignIn = async (customScopes = SCOPES) => {
  try {
    isSigningIn = true;
    const activeProvider = createGoogleProvider(customScopes);
    const result = await signInWithPopup(auth, activeProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    await ensureUserProfileInFirestore(result.user);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async () => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Sanitize ID to match ^[a-zA-Z0-9_\-]+$ and maxLength 128
function sanitizeDocId(rawId) {
  const cleaned = String(rawId || `doc_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned || `doc_${Date.now()}`;
}

export async function ensureUserProfileInFirestore(user, churchName = 'Shammah Fellowship') {
  if (!user?.uid) return;
  const uid = sanitizeDocId(user.uid);
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDocFromServer(ref);
    const displayName = String(user.displayName || user.email?.split('@')[0] || 'Believer').slice(0, 80);
    const photoURL = String(user.photoURL || '').slice(0, 500);
    const safeChurch = String(churchName || '').slice(0, 120);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        displayName,
        photoURL,
        churchName: safeChurch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    // Non-fatal if user email is not verified or offline, but log via handler if permission error
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export const ensureFirestoreUserProfile = ensureUserProfileInFirestore;

export function subscribeToPrayerRequests(onData, onError) {
  if (!auth.currentUser) return () => {};
  const path = 'prayerRequests';
  const q = query(
    collection(db, path),
    where('status', 'in', ['active', 'answered']),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled and logged
      }
    }
  );
}

export async function createPrayerRequestInFirestore({ title, content, category = 'general' }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google first.');
  await ensureUserProfileInFirestore(user);

  const requestId = sanitizeDocId(`pr_${user.uid.slice(0, 16)}_${Date.now()}`);
  const path = `prayerRequests/${requestId}`;
  const allowedCategories = ['healing', 'family', 'missions', 'thanksgiving', 'guidance', 'general'];
  const safeCategory = allowedCategories.includes(category) ? category : 'general';

  try {
    await setDoc(doc(db, 'prayerRequests', requestId), {
      authorId: sanitizeDocId(user.uid),
      authorName: String(user.displayName || user.email?.split('@')[0] || 'Fellowship Member').slice(0, 80),
      title: String(title || 'Prayer Request').trim().slice(0, 140),
      content: String(content || '').trim().slice(0, 2000),
      category: safeCategory,
      status: 'active',
      prayedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function incrementPrayerCountInFirestore(requestId, currentCount) {
  const safeId = sanitizeDocId(requestId);
  const path = `prayerRequests/${safeId}`;
  try {
    await updateDoc(doc(db, 'prayerRequests', safeId), {
      prayedCount: Number(currentCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markPrayerAnsweredInFirestore(requestId) {
  const safeId = sanitizeDocId(requestId);
  const path = `prayerRequests/${safeId}`;
  try {
    await updateDoc(doc(db, 'prayerRequests', safeId), {
      status: 'answered',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePrayerRequestFromFirestore(requestId) {
  const safeId = sanitizeDocId(requestId);
  const path = `prayerRequests/${safeId}`;
  try {
    await deleteDoc(doc(db, 'prayerRequests', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToMinistryNotes(onData, onError) {
  const user = auth.currentUser;
  if (!user) return () => {};
  const path = 'ministryNotes';
  const q = query(
    collection(db, path),
    where('ownerId', '==', sanitizeDocId(user.uid)),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Handled and logged
      }
    }
  );
}

export async function saveMinistryNoteToFirestore({ title, scriptureRef = '', body }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with Google first.');
  await ensureUserProfileInFirestore(user);

  const noteId = sanitizeDocId(`note_${user.uid.slice(0, 16)}_${Date.now()}`);
  const path = `ministryNotes/${noteId}`;
  try {
    await setDoc(doc(db, 'ministryNotes', noteId), {
      ownerId: sanitizeDocId(user.uid),
      title: String(title || 'Sermon Note').trim().slice(0, 160),
      scriptureRef: String(scriptureRef || '').trim().slice(0, 100),
      body: String(body || '').trim().slice(0, 5000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return noteId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMinistryNoteFromFirestore(noteId) {
  const safeId = sanitizeDocId(noteId);
  const path = `ministryNotes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'ministryNotes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
