# Missing Flows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the church routing crash, add profile editing, clean up public profiles from mock data, and build a real Firestore-backed messaging system.

**Architecture:** All data in Firestore. Church users share the musician tab layout. Messages use flat `conversations` + `messages` collections with `array-contains` queries and `onSnapshot` for real-time chat.

**Tech Stack:** Firestore, React Native, Expo Router v3, Zustand, react-native-paper

---

### Task 1: Fix church routing crash

**Files:**
- Modify: `app/(auth)/onboarding.tsx`

**Step 1: Fix the route**

Change line 93:
```ts
// Before
router.replace('/(church)/home');
// After
router.replace('/(musician)/home');
```

Both roles now share the musician tab layout. Church users post gigs via the Post a Gig button.

**Step 2: Commit**
```bash
git add app/(auth)/onboarding.tsx
git commit -m "fix: route church users to musician home after onboarding"
```

---

### Task 2: Add types for messages and conversations

**Files:**
- Modify: `lib/types.ts`

Append to the end of the file:
```ts
export interface Conversation {
  id: string;
  participants: string[];
  gig_id: string;
  gig_title: string;
  musician_id: string;
  poster_id: string;
  musician_name: string;
  poster_name: string;
  last_message: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}
```

**Step: Commit**
```bash
git add lib/types.ts
git commit -m "feat: add Conversation and Message types"
```

---

### Task 3: Extend Firebase wrapper with orderBy and onSnapshot

**Files:**
- Modify: `lib/firebase.ts`

Add to imports from `'firebase/firestore'`:
```ts
orderBy as firestoreOrderBy,
onSnapshot as firestoreOnSnapshot,
```

Add these two methods to the `builder` object (after `add`):
```ts
orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
  constraints.push(firestoreOrderBy(field, direction));
  return builder;
},
onSnapshot: (callback: (snap: { docs: { id: string; data: () => any }[] }) => void) => {
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
  return firestoreOnSnapshot(q as any, (snap) => {
    callback({ docs: snap.docs.map((d) => ({ id: d.id, data: () => d.data() })) });
  });
},
```

`onSnapshot` returns the unsubscribe function automatically (Firebase JS SDK passes it through).

**Step: Commit**
```bash
git add lib/firebase.ts
git commit -m "feat: add orderBy and onSnapshot to web Firebase wrapper"
```

---

### Task 4: Profile editing

**Files:**
- Modify: `app/(musician)/profile.tsx`

Replace the entire file. The new version adds:
- An "Edit Profile" button in the header row
- A `Portal + Modal` with form fields pre-populated from the current profile
- On save: `firestore().collection('users').doc(user.uid).update(...)` then `fetchProfile()`
- For musicians: also shows instruments checkboxes + rate field

New state needed:
```ts
const fetchProfile = useAuthStore((s) => s.fetchProfile);
const [editVisible, setEditVisible] = useState(false);
const [displayName, setDisplayName] = useState('');
const [bio, setBio] = useState('');
const [city, setCity] = useState('');
const [stateName, setStateName] = useState('');
const [instruments, setInstruments] = useState<InstrumentKey[]>([]);
const [rate, setRate] = useState('');
const [saving, setSaving] = useState(false);
```

Pre-populate on open:
```ts
const openEdit = () => {
  setDisplayName(profile?.display_name ?? '');
  setBio(profile?.bio ?? '');
  setCity(profile?.location_city ?? '');
  setStateName(profile?.location_state ?? '');
  const details = (profile as any)?.musician_details;
  setInstruments(details?.instruments ?? []);
  setRate(details?.rate_per_service?.toString() ?? '');
  setEditVisible(true);
};
```

Save handler:
```ts
const handleSave = async () => {
  if (!user || !displayName.trim()) return;
  setSaving(true);
  try {
    const updates: Record<string, unknown> = {
      display_name: displayName.trim(),
      bio: bio.trim(),
      location_city: city.trim(),
      location_state: stateName.trim(),
    };
    if (profile?.role === 'musician') {
      updates['musician_details.instruments'] = instruments;
      updates['musician_details.rate_per_service'] = rate ? parseFloat(rate) : null;
    }
    await firestore().collection('users').doc(user.uid).update(updates);
    await fetchProfile();
    setEditVisible(false);
  } finally {
    setSaving(false);
  }
};
```

Add an "Edit Profile" button below the avatar row (visible when logged in):
```tsx
<Button mode="outlined" onPress={openEdit} style={styles.editButton}>
  Edit Profile
</Button>
```

Modal with TextInput fields for display name, bio, city, state, and (if musician) instrument checkboxes + rate.

New styles needed:
```ts
editButton: { marginBottom: Spacing.lg },
editModal: { backgroundColor: Colors.surface, margin: Spacing.lg, padding: Spacing.lg, borderRadius: 16, maxHeight: '85%' },
modalTitle: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.lg },
modalInput: { marginBottom: Spacing.md },
modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
```

Add imports: `Portal, Modal` from `react-native-paper`, `Checkbox` from `react-native-paper`, `ScrollView` from `react-native`, `firestore` from `@/lib/firebase`, `INSTRUMENTS, InstrumentKey` from `@/constants/instruments`.

**Step: Commit**
```bash
git add app/(musician)/profile.tsx
git commit -m "feat: add profile editing"
```

---

### Task 5: Clean up public profile — remove mock data

**Files:**
- Modify: `app/public-profile/[id].tsx`

**Removals:**
1. Remove `import { MOCK_GIGS } from '@/constants/mockData'`
2. Remove `import { MOCK_CHURCH_DETAILS, MockChurchExtras } from '@/constants/mockChurchDetails'`
3. Remove `const [mockExtras, setMockExtras] = useState<MockChurchExtras | null>(null)`
4. Remove the entire `if (id.startsWith('mock-'))` block (lines 25–44)

**Updates:**
- Change the identity chip values to use `churchDetails` directly:
  ```ts
  const denomination = churchDetails?.denomination;
  const worshipStyle = churchDetails?.worship_style;
  const congregationSize = churchDetails?.congregation_size;
  ```
- Remove the social media section JSX (`{mockExtras?.social && ...}`)
- Remove the reviews section JSX (`{mockExtras?.reviews && ...}`)
- Remove `ProgressBar` from react-native-paper import (no longer used)
- Remove `MaterialCommunityIcons` import (no longer used)

**Step: Commit**
```bash
git add app/public-profile/[id].tsx
git commit -m "feat: remove mock data from public profiles, use real Firestore church details"
```

---

### Task 6: Create conversation on apply

**Files:**
- Modify: `app/(musician)/home.tsx`

**Step 1:** Add `profile` to the useAuthStore destructure:
```ts
const { user, profile } = useAuthStore();
```

**Step 2:** In `handleConfirmApply`, after the `applications.add(...)` call, add:
```ts
firestore().collection('conversations').add({
  participants: [user.uid, applyModalGig.church_id],
  gig_id: applyModalGig.id,
  gig_title: applyModalGig.title,
  musician_id: user.uid,
  poster_id: applyModalGig.church_id,
  musician_name: profile?.display_name ?? user.email ?? 'Musician',
  poster_name: applyModalGig.church?.display_name ?? 'Church',
  last_message: '',
  last_message_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}).catch(() => {});
```

**Step: Commit**
```bash
git add app/(musician)/home.tsx
git commit -m "feat: create Firestore conversation when musician applies to gig"
```

---

### Task 7: Messages screen — conversation list

**Files:**
- Modify: `app/(musician)/messages.tsx`

Full replacement. The screen:
1. If not logged in: show sign-in prompt (same pattern as profile.tsx)
2. On mount: fetch conversations where `participants array-contains user.uid`
3. Shows a list using `FlatList` — each row: gig title, other person's name, last message, timestamp
4. Tap row → `router.push('/conversation/' + item.id)`
5. Empty state: "No messages yet. Apply to a gig to start a conversation."
6. Pull-to-refresh

```ts
import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { MessageCircle, LogIn } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { Conversation } from '@/lib/types';
import { Button } from 'react-native-paper';
```

Fetch logic:
```ts
const fetchConversations = async () => {
  if (!user) return;
  try {
    const snap = await firestore()
      .collection('conversations')
      .where('participants', 'array-contains', user.uid)
      .get();
    const convos = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as Conversation)
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    setConversations(convos);
  } finally {
    setLoading(false);
  }
};
```

Row renders: gig title bold, other person's name secondary, last message preview truncated to 1 line, timestamp right-aligned.

Helper to get the other participant's name:
```ts
const otherName = (c: Conversation) =>
  user?.uid === c.musician_id ? c.poster_name : c.musician_name;
```

**Step: Commit**
```bash
git add app/(musician)/messages.tsx
git commit -m "feat: build messages screen with Firestore conversation list"
```

---

### Task 8: Conversation screen — real-time chat

**Files:**
- Create: `app/conversation/[id].tsx`
- Modify: `app/_layout.tsx`

**Step 1: Register route in `_layout.tsx`**

Add inside the `<Stack>`:
```tsx
<Stack.Screen name="conversation/[id]" />
```

**Step 2: Create `app/conversation/[id].tsx`**

The screen:
1. Header: back button (`router.back()`), gig title + other person's name
2. `FlatList` of messages (inverted so newest is at bottom, `inverted` prop)
3. Text input + send button pinned to bottom (above keyboard)
4. Real-time via `onSnapshot`

Key state:
```ts
const [conversation, setConversation] = useState<Conversation | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [inputText, setInputText] = useState('');
const [sending, setSending] = useState(false);
```

Fetch conversation + set up real-time listener:
```ts
useEffect(() => {
  if (!id) return;

  // Fetch conversation metadata
  firestore().collection('conversations').doc(id as string).get()
    .then(doc => {
      if (doc.exists) setConversation({ id: doc.id, ...doc.data() } as Conversation);
    });

  // Real-time messages
  const unsubscribe = firestore()
    .collection('messages')
    .where('conversation_id', '==', id)
    .orderBy('created_at', 'asc')
    .onSnapshot((snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
    });

  return () => unsubscribe();
}, [id]);
```

Send handler:
```ts
const handleSend = async () => {
  if (!inputText.trim() || !user) return;
  const text = inputText.trim();
  setInputText('');
  setSending(true);
  try {
    await firestore().collection('messages').add({
      conversation_id: id,
      sender_id: user.uid,
      text,
      created_at: new Date().toISOString(),
    });
    await firestore().collection('conversations').doc(id as string).update({
      last_message: text,
      last_message_at: new Date().toISOString(),
    });
  } finally {
    setSending(false);
  }
};
```

Message bubble rendering:
```ts
const isMine = (msg: Message) => msg.sender_id === user?.uid;
```
- Mine: right-aligned, primary background, white text
- Theirs: left-aligned, surface background, normal text

Use `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android to keep input above keyboard.

Imports needed: `KeyboardAvoidingView, Platform, TextInput as RNTextInput` from `react-native`, `ArrowLeft, Send` from `lucide-react-native`, `Conversation, Message` from `@/lib/types`.

**Step: Commit**
```bash
git add app/conversation/[id].tsx app/_layout.tsx
git commit -m "feat: build real-time conversation screen with Firestore onSnapshot"
```

---

## Verification

1. Register as "church" role → onboarding completes → lands on musician home (no crash)
2. Edit profile → changes persist after app restart
3. Open public profile of a real user → no mock data shown, real church details visible
4. Apply to a gig → check Firestore: `applications` doc created, `conversations` doc created
5. Go to Messages tab → conversation appears in list
6. Tap conversation → messages screen opens, send a message → appears in real-time
7. Open two devices/simulators with different accounts → messages from one appear on other in real-time
