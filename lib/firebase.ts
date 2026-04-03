// Web Firebase implementation using the JS SDK.
// On iOS/Android, lib/firebase.native.ts is loaded instead (uses @react-native-firebase).
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as _signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where as firestoreWhere,
  getDocs,
  addDoc,
  orderBy as firestoreOrderBy,
  onSnapshot as firestoreOnSnapshot,
  type QueryConstraint,
  type WhereFilterOp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const _auth = getAuth(app);
const _db = getFirestore(app);

// Wrap in the same callable API shape as @react-native-firebase so authStore works unchanged.
export const auth = () => ({
  currentUser: _auth.currentUser,
  onAuthStateChanged: (cb: (user: any) => void) => onAuthStateChanged(_auth, cb),
  createUserWithEmailAndPassword: (email: string, password: string) =>
    createUserWithEmailAndPassword(_auth, email, password),
  signInWithEmailAndPassword: (email: string, password: string) =>
    signInWithEmailAndPassword(_auth, email, password),
  signOut: () => _signOut(_auth),
});

export const firestore = () => ({
  collection: (path: string) => {
    const colRef = collection(_db, path);
    const constraints: QueryConstraint[] = [];

    const builder = {
      doc: (id: string) => ({
        set: (data: object) => setDoc(doc(_db, path, id), data),
        update: (data: object) => updateDoc(doc(_db, path, id), data),
        get: () =>
          getDoc(doc(_db, path, id)).then((snap) => ({
            exists: snap.exists(),
            data: () => snap.data(),
          })),
      }),
      where: (field: string, op: WhereFilterOp, value: unknown) => {
        constraints.push(firestoreWhere(field, op, value));
        return builder;
      },
      get: async () => {
        const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
        const snap = await getDocs(q as any);
        return {
          docs: snap.docs.map((d) => ({ id: d.id, data: () => d.data() })),
        };
      },
      add: (data: object) => addDoc(colRef, data),
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
        constraints.push(firestoreOrderBy(field, direction));
        return builder;
      },
      onSnapshot: (
        callback: (snap: { docs: { id: string; data: () => any }[] }) => void,
        onError?: (error: Error) => void
      ) => {
        const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
        return firestoreOnSnapshot(q as any, (snap) => {
          callback({ docs: snap.docs.map((d) => ({ id: d.id, data: () => d.data() })) });
        }, onError);
      },
    };

    return builder;
  },
});
