import { create } from 'zustand';
import { auth, firestore } from '@/lib/firebase';
import { Profile, UserRole } from '@/lib/types';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

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
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    await auth().signInWithEmailAndPassword(email, password);
    set({ loading: false });
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
