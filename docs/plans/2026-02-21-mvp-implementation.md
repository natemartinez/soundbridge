# OnSpace MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a working Expo Router app with auth, role-based navigation, profile setup, gig posting, and search for a worship musician ↔ church marketplace.

**Architecture:** Expo Router file-based routing with route groups `(auth)`, `(musician)`, `(church)`. Supabase for auth and data. Zustand for client auth state. React Native Paper for UI components.

**Tech Stack:** Expo SDK 53, Expo Router 5, TypeScript, Supabase, Zustand, React Native Paper, Lucide icons

---

### Task 1: Foundation — Constants, Types, and Supabase Client

**Files:**
- Create: `constants/theme.ts`
- Create: `constants/instruments.ts`
- Create: `lib/types.ts`
- Create: `lib/supabase.ts`

**Step 1: Create theme constants**

```ts
// constants/theme.ts
export const Colors = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  secondary: '#FF6584',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

**Step 2: Create instruments enum**

```ts
// constants/instruments.ts
export const INSTRUMENTS = [
  { key: 'vocals', label: 'Vocals' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'bass', label: 'Bass' },
  { key: 'drums', label: 'Drums' },
  { key: 'keys', label: 'Keys / Piano' },
  { key: 'audio_tech', label: 'Audio Tech' },
  { key: 'other', label: 'Other' },
] as const;

export type InstrumentKey = (typeof INSTRUMENTS)[number]['key'];
```

**Step 3: Create shared TypeScript types**

```ts
// lib/types.ts
import { InstrumentKey } from '@/constants/instruments';

export type UserRole = 'musician' | 'church';
export type GigStatus = 'open' | 'filled' | 'cancelled';
export type WorshipStyle = 'contemporary' | 'traditional' | 'blended';
export type CongregationSize = 'small' | 'medium' | 'large';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  location_city: string;
  location_state: string;
  created_at: string;
}

export interface MusicianDetails {
  id: string;
  instruments: InstrumentKey[];
  experience_years: number;
  available: boolean;
  rate_per_service: number | null;
}

export interface ChurchDetails {
  id: string;
  denomination: string;
  worship_style: WorshipStyle;
  congregation_size: CongregationSize;
  website_url: string | null;
}

export interface Gig {
  id: string;
  church_id: string;
  title: string;
  description: string;
  instruments_needed: InstrumentKey[];
  date: string;
  time: string;
  pay_offered: number | null;
  status: GigStatus;
  created_at: string;
  // Joined fields
  church?: Profile;
}

export interface MusicianWithDetails extends Profile {
  musician_details: MusicianDetails;
}

export interface ChurchWithDetails extends Profile {
  church_details: ChurchDetails;
}
```

**Step 4: Create Supabase client**

```ts
// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Step 5: Create .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 6: Verify — no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: Clean (or only errors from missing app/ files, which we create next)

---

### Task 2: Zustand Auth Store

**Files:**
- Create: `stores/authStore.ts`

**Step 1: Create auth store**

```ts
// stores/authStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Profile, MusicianDetails, ChurchDetails, UserRole } from '@/lib/types';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, initialized: true });

    if (session) {
      await get().fetchProfile();
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  signUp: async (email, password, role) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        display_name: '',
        bio: '',
        location_city: '',
        location_state: '',
      });
      if (profileError) throw profileError;
    }
    set({ loading: false });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  setProfile: (profile) => set({ profile }),
}));
```

---

### Task 3: Root Layout and Entry Redirect

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`

**Step 1: Create root layout with providers**

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (initialized) {
      SplashScreen.hideAsync();
    }
  }, [initialized]);

  if (!initialized) return null;

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
```

**Step 2: Create entry redirect**

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profile || !profile.display_name) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (profile.role === 'musician') {
    return <Redirect href="/(musician)/home" />;
  }

  return <Redirect href="/(church)/home" />;
}
```

**Step 3: Verify — app starts without crash**

Run: `npx expo start --web`
Expected: App loads (may show blank/redirect depending on env vars)

---

### Task 4: Auth Screens — Login and Register

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/register.tsx`

**Step 1: Auth layout (simple stack)**

```tsx
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 2: Login screen**

```tsx
// app/(auth)/login.tsx
import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);

  const handleLogin = async () => {
    setError('');
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text variant="headlineLarge" style={styles.title}>OnSpace</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connecting musicians with churches
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          Sign In
        </Button>

        <Link href="/(auth)/register" asChild>
          <Button mode="text">Don't have an account? Sign up</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', fontWeight: 'bold', color: Colors.primary },
  subtitle: { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.xl },
  input: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.md, marginBottom: Spacing.sm },
});
```

**Step 3: Register screen with role selector**

```tsx
// app/(auth)/register.tsx
import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';
import { UserRole } from '@/lib/types';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('musician');
  const [error, setError] = useState('');
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);

  const handleRegister = async () => {
    setError('');
    try {
      await signUp(email.trim(), password, role);
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Registration failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text variant="headlineLarge" style={styles.title}>Join OnSpace</Text>

        <Text variant="titleMedium" style={styles.label}>I am a...</Text>
        <SegmentedButtons
          value={role}
          onValueChange={(v) => setRole(v as UserRole)}
          buttons={[
            { value: 'musician', label: 'Musician' },
            { value: 'church', label: 'Church' },
          ]}
          style={styles.segmented}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          Create Account
        </Button>

        <Link href="/(auth)/login" asChild>
          <Button mode="text">Already have an account? Sign in</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.sm },
  segmented: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.md, marginBottom: Spacing.sm },
});
```

**Step 4: Verify — navigate between login and register**

Run: `npx expo start --web`
Expected: Login screen renders, "Sign up" link navigates to register, role toggle works

---

### Task 5: Onboarding Screen

**Files:**
- Create: `app/(auth)/onboarding.tsx`

**Step 1: Create onboarding with role-conditional fields**

This screen shows after registration. It collects display_name, bio, location, and role-specific fields (instruments for musicians, denomination/style for churches). After saving, redirects to the appropriate tab group.

The onboarding screen should:
- Fetch the current profile to determine role
- Show common fields (name, bio, city, state)
- Show musician fields (instrument checkboxes, experience, rate) if role=musician
- Show church fields (denomination, worship style, congregation size) if role=church
- Save to profiles + musician_details or church_details tables
- Redirect to `/(musician)/home` or `/(church)/home`

Implementation should use React Native Paper components: TextInput, Checkbox, Button, SegmentedButtons. Use ScrollView for the form since it has many fields.

---

### Task 6: Musician Tab Layout and Home Screen

**Files:**
- Create: `app/(musician)/_layout.tsx`
- Create: `app/(musician)/home.tsx`

**Step 1: Musician tab layout**

```tsx
// app/(musician)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Search, User, MessageCircle, Settings } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function MusicianLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Gigs',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Musician home — list of open gigs**

Fetches gigs with status='open' from Supabase, joined with the church's profile. Displays as a FlatList of GigCard components. Pull-to-refresh support.

---

### Task 7: Church Tab Layout and Home Screen

**Files:**
- Create: `app/(church)/_layout.tsx`
- Create: `app/(church)/home.tsx`

Same pattern as Task 6 but for churches. Tabs: Browse Musicians, Post Gig, Profile, Messages, Settings. Home screen fetches musicians where available=true, displays as ProfileCard list.

---

### Task 8: Reusable Components — GigCard and ProfileCard

**Files:**
- Create: `components/GigCard.tsx`
- Create: `components/ProfileCard.tsx`

**Step 1: GigCard** — displays gig title, church name, date, instruments needed as chips, pay. Tappable to navigate to gig detail or church profile.

**Step 2: ProfileCard** — displays musician name, instruments as chips, location, availability badge, rate. Tappable to navigate to public profile.

Both use React Native Paper's Card, Chip, and Text components.

---

### Task 9: Search and Filter Screens

**Files:**
- Create: `app/(musician)/search.tsx`
- Create: `app/(church)/home.tsx` (already created in Task 7, add filter logic)

**Step 1: Musician search** — search/filter gigs by instrument, location, date. Uses Supabase query with `.contains()` for instrument arrays, `.ilike()` for city/state text search.

**Step 2: Church browse** — search/filter musicians by instrument, location, availability. Same query patterns.

Both screens: TextInput for search, Chip toggles for instrument filters, FlatList for results.

---

### Task 10: Gig Posting Screen (Church)

**Files:**
- Create: `app/(church)/post-gig.tsx`

Form for churches to create a gig: title, description, instruments needed (multi-select chips), date picker, time picker, pay offered. Inserts into `gigs` table. On success, navigates back to home.

Uses `@react-native-community/datetimepicker` for date/time selection.

---

### Task 11: Profile Screens and Public Profile

**Files:**
- Create: `app/(musician)/profile.tsx`
- Create: `app/(church)/profile.tsx`
- Create: `app/public-profile/[id].tsx`

**Step 1: Own profile screens** — display current user's profile with an Edit button. Musician profile shows instruments, experience, rate, availability toggle. Church profile shows denomination, worship style, size.

**Step 2: Public profile** — shared screen at `/public-profile/[id]`. Fetches profile + role-specific details by ID. Shows read-only view with a "Message" button (disabled stub for now).

---

### Task 12: Stub Screens — Messages and Settings

**Files:**
- Create: `app/(musician)/messages.tsx`
- Create: `app/(musician)/settings.tsx`
- Create: `app/(church)/messages.tsx`
- Create: `app/(church)/settings.tsx`

**Step 1: Messages stub** — "Coming soon" placeholder with illustration.

**Step 2: Settings** — displays user email, role, and a Sign Out button that calls `useAuthStore.signOut()` and redirects to login.

---

### Task 13: Assets and Final Wiring

**Files:**
- Create: `assets/images/app-icon.png` (placeholder)
- Create: `.env.example`

**Step 1:** Create a simple placeholder app icon (or copy a generic one).

**Step 2:** Verify the full app flow end-to-end:
- `npx expo start --web`
- Register as musician → onboarding → musician tabs → browse gigs
- Register as church → onboarding → church tabs → browse musicians → post gig

**Step 3:** Create Supabase SQL migration file at `docs/supabase-schema.sql` with all CREATE TABLE statements so the user can run it in their Supabase dashboard.

---

### Task 14: Supabase Schema SQL

**Files:**
- Create: `docs/supabase-schema.sql`

Complete SQL file with:
- `profiles` table with RLS policies (users can read all, update own)
- `musician_details` table with RLS
- `church_details` table with RLS
- `gigs` table with RLS (churches can insert/update own, all can read open gigs)
- `conversations` and `messages` tables (created but not used yet)
- Trigger to auto-create profile on auth.users insert (optional)
