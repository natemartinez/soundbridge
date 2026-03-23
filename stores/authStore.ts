import { create } from 'zustand';
import { auth, firestore } from '@/lib/firebase';
import { Profile, UserRole } from '@/lib/types';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

function friendlyAuthError(e: any): Error {
  const code: string = e?.code ?? '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':  'Network error. Please check your connection.',
    'auth/user-disabled':           'This account has been disabled. Please contact support.',
  };
  return new Error(messages[code] ?? 'Something went wrong. Please try again.');
}

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => void;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: () => {
    try {
      auth().onAuthStateChanged((user) => {
        set({ user, initialized: true });
        if (user) {
          get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch {
      set({ initialized: true });
    }
  },

  signUp: async (email, password, role) => {
    set({ loading: true });
    try {
      const { user } = await auth().createUserWithEmailAndPassword(email, password);

      await firestore().collection('users').doc(user.uid).set({
        role,
        display_name: '',
        bio: '',
        location_city: '',
        location_state: '',
        account_tier: 'basic',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      throw friendlyAuthError(e);
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e) {
      throw friendlyAuthError(e);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await auth().signOut();
    set({ user: null, profile: null });
  },

  fetchProfile: async () => {
    const user = auth().currentUser;
    if (!user) return;

    const doc = await firestore().collection('users').doc(user.uid).get();
    if (doc.exists) {
      set({ profile: { id: user.uid, ...doc.data() } as Profile });
    }
  },

  setProfile: (profile) => set({ profile }),
}));
