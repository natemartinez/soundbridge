# Firebase Migration Design — Replace Supabase

**Date:** 2026-03-06
**Goal:** Replace Supabase with Firebase as the all-in-one backend (auth + database + cloud functions) for cost and simplicity.

---

## What Changes

| Layer | Supabase (current) | Firebase (target) |
|-------|--------------------|--------------------|
| Auth | `@supabase/supabase-js` auth | `@react-native-firebase/auth` |
| Database | Postgres tables (profiles, musician_details, church_details) | Firestore collections (users, with embedded details) |
| Server functions | Deno edge functions in `supabase/functions/` | Node.js Cloud Functions in `functions/` |
| Config | Env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) | Native config files (`GoogleService-Info.plist`, `google-services.json`) |
| JWT verification | `supabase.auth.getUser()` | `admin.auth().verifyIdToken()` |

## What Stays the Same

- All mock data (`constants/mockData.ts`)
- All UI components and screens
- Zustand auth store structure (state shape, methods)
- Stripe integration pattern (PaymentSheet hooks)
- All types in `lib/types.ts`
- The `payment_type` metadata branching in webhook

## Firestore Schema

```
users/{uid}
  ├── role: 'musician' | 'church'
  ├── display_name: string
  ├── bio: string
  ├── avatar_url: string | null
  ├── location_city: string
  ├── location_state: string
  ├── location_address?: string
  ├── account_tier: 'basic' | 'premium'
  ├── created_at: timestamp
  ├── musician_details?: { instruments, experience_years, available, rate_per_service }
  └── church_details?: { denomination, worship_style, congregation_size, website_url }
```

Single document per user with optional embedded details (no subcollections needed — profile data is small and always fetched together).

## Files Modified/Created/Deleted

| Action | File |
|--------|------|
| **Create** | `lib/firebase.ts` |
| **Create** | `functions/src/index.ts` (exports all cloud functions) |
| **Create** | `functions/src/createPaymentIntent.ts` |
| **Create** | `functions/src/createGigPayment.ts` |
| **Create** | `functions/src/stripeWebhook.ts` |
| **Create** | `functions/package.json` + `functions/tsconfig.json` |
| **Modify** | `stores/authStore.ts` (rewrite auth calls) |
| **Modify** | `components/useGigPayment.native.ts` (use Firebase token) |
| **Modify** | `components/useStripeUpgrade.native.ts` (use Firebase token) |
| **Modify** | `app/_layout.tsx` (remove StripeWrapper's Supabase dep, add Firebase init) |
| **Modify** | `package.json` (swap packages) |
| **Modify** | `app.json` (add Firebase plugin config) |
| **Delete** | `lib/supabase.ts` |
| **Delete** | `supabase/functions/` directory |
| **Delete** | `components/StripeWrapper.native.tsx` (StripeProvider moves to layout) |

## Auth Call Mapping

| Method | Supabase | Firebase |
|--------|----------|----------|
| Initialize | `supabase.auth.getSession()` + `onAuthStateChange()` | `auth().onAuthStateChanged()` |
| Sign up | `supabase.auth.signUp({ email, password })` | `auth().createUserWithEmailAndPassword(email, password)` |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` | `auth().signInWithEmailAndPassword(email, password)` |
| Sign out | `supabase.auth.signOut()` | `auth().signOut()` |
| Get token | `session?.access_token` | `await auth().currentUser?.getIdToken()` |
| Profile create | `supabase.from('profiles').insert({...})` | `firestore().collection('users').doc(uid).set({...})` |
| Profile fetch | `supabase.from('profiles').select('*').eq('id', uid).single()` | `firestore().collection('users').doc(uid).get()` |
| Profile update | `supabase.from('profiles').update({...}).eq('id', uid)` | `firestore().collection('users').doc(uid).update({...})` |

## Cloud Function Auth Pattern

```ts
// Firebase Cloud Function — verify caller identity
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
const token = authHeader.split('Bearer ')[1];
const decoded = await admin.auth().verifyIdToken(token);
const uid = decoded.uid; // replaces supabase_user_id
```

## Implementation Order — COMPLETED

1. ✅ Package swap + Firebase init (`lib/firebase.ts`, `package.json`, `app.json`)
2. ✅ Auth store rewrite (`stores/authStore.ts`)
3. ✅ Payment hooks update (swap token retrieval)
4. ✅ Cloud Functions port (3 functions, Deno → Node.js)
5. ✅ Update onboarding.tsx and public-profile to use Firestore
6. ✅ Add auth initialization in root layout (`app/_layout.tsx`)
7. ✅ Delete Supabase files + update `.env.example`

## Prerequisites (manual, one-time)

1. Create Firebase project at console.firebase.google.com
2. Enable Email/Password auth provider
3. Enable Firestore database (start in test mode)
4. Download config files → project root
5. Upgrade to Blaze plan (for Stripe API calls from Cloud Functions)
6. Set Stripe secrets: `firebase functions:config:set stripe.secret_key="sk_test_..." stripe.webhook_secret="whsec_..."`
