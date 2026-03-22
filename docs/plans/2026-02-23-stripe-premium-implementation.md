# Stripe Premium Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a $9.99/month Stripe subscription that unlocks the Hot Gigs section for musicians, using Supabase Edge Functions as the backend.

**Architecture:** Two Supabase Edge Functions handle Stripe logic server-side (`create-payment-intent` returns a clientSecret for the native PaymentSheet; `stripe-webhook` listens for `payment_intent.succeeded` and flips `profiles.account_tier = 'premium'`). The app uses the already-installed `@stripe/stripe-react-native` to present the native payment UI. Premium state is stored in Supabase and read from `authStore.profile.account_tier`.

**Tech Stack:** `@stripe/stripe-react-native`, Supabase Edge Functions (Deno/TypeScript), Stripe API, Zustand (`authStore`), Expo Router

---

## Prerequisites (manual steps before coding)

Before starting, the following accounts and values are needed:

1. Create a free [Stripe account](https://dashboard.stripe.com/register)
2. In Stripe dashboard → Developers → API Keys, copy:
   - **Publishable key** (`pk_test_...`) → add to `.env` as `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (`sk_test_...`) → will be set as Supabase secret
3. Install [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`
4. Login: `supabase login`
5. Link project: `supabase link --project-ref <your-project-ref>` (find ref in Supabase dashboard URL)

---

## Task 1: Database Migration — Add `account_tier` Column

**Files:**
- Modify: `docs/supabase-schema.sql`
- Run migration in: Supabase Dashboard → SQL Editor

**Step 1: Update schema file**

In `docs/supabase-schema.sql`, add after the `profiles` table definition (after `created_at` line):

```sql
-- Add to profiles table (run separately as migration)
alter table public.profiles
  add column if not exists account_tier text not null default 'basic'
  check (account_tier in ('basic', 'premium'));
```

**Step 2: Run migration in Supabase**

Go to Supabase Dashboard → SQL Editor → New Query, paste and run:

```sql
alter table public.profiles
  add column if not exists account_tier text not null default 'basic'
  check (account_tier in ('basic', 'premium'));
```

Expected: "Success. No rows returned."

**Step 3: Verify in Table Editor**

Dashboard → Table Editor → profiles → confirm `account_tier` column exists with default `'basic'`.

**Step 4: Commit schema change**

```bash
git add docs/supabase-schema.sql
git commit -m "feat: add account_tier column to profiles schema"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add `account_tier` to Profile interface**

In `lib/types.ts`, update the `Profile` interface:

```typescript
export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  location_city: string;
  location_state: string;
  location_address?: string;
  account_tier: AccountTier;   // ADD THIS LINE
  created_at: string;
}
```

`AccountTier` is already defined in this file as `'basic' | 'premium'`.

**Step 2: Verify no TypeScript errors**

The `authStore.fetchProfile()` uses `select('*')` so it will automatically include `account_tier` from the DB — no store changes needed.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add account_tier to Profile type"
```

---

## Task 3: Initialize Stripe Provider in App Layout

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Add StripeProvider**

`@stripe/stripe-react-native` requires a `StripeProvider` wrapping the app. Update `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: Colors.chipBackground,
    onPrimaryContainer: Colors.primaryDark,
    background: Colors.background,
    surface: Colors.surface,
    onSurface: Colors.text,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.border,
    error: Colors.error,
    surfaceVariant: Colors.surface,
  },
};

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
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </StripeProvider>
  );
}
```

Note: Also switch `MD3DarkTheme` → `MD3LightTheme` here to match the new light palette.

**Step 2: Add publishable key to `.env`**

In `.env`:
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

**Step 3: Commit**

```bash
git add app/_layout.tsx .env.example
git commit -m "feat: add StripeProvider to app layout"
```

---

## Task 4: Supabase Edge Function — `create-payment-intent`

**Files:**
- Create: `supabase/functions/create-payment-intent/index.ts`

**Step 1: Scaffold functions directory**

```bash
mkdir -p supabase/functions/create-payment-intent
```

**Step 2: Create the Edge Function**

Create `supabase/functions/create-payment-intent/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Find or create Stripe customer tied to Supabase user ID
    const existingCustomers = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
    }

    // Create ephemeral key for PaymentSheet
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );

    // Create PaymentIntent for $9.99
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999, // $9.99 in cents
      currency: 'usd',
      customer: customer.id,
      metadata: { supabase_user_id: user.id },
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customerId: customer.id,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
```

**Step 3: Set Stripe secret in Supabase**

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

**Step 4: Deploy the function**

```bash
supabase functions deploy create-payment-intent --no-verify-jwt
```

Wait — this function DOES verify JWT manually, so pass `--no-verify-jwt` to disable the automatic JWT check (we handle it ourselves).

**Step 5: Test with curl**

```bash
# Get a token from Supabase (sign in first, copy JWT from network tab or authStore)
curl -X POST https://<project-ref>.supabase.co/functions/v1/create-payment-intent \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json"
```

Expected: JSON with `clientSecret`, `ephemeralKey`, `customerId`.

**Step 6: Commit**

```bash
git add supabase/functions/create-payment-intent/index.ts
git commit -m "feat: add create-payment-intent Edge Function"
```

---

## Task 5: Supabase Edge Function — `stripe-webhook`

**Files:**
- Create: `supabase/functions/stripe-webhook/index.ts`

**Step 1: Scaffold directory**

```bash
mkdir -p supabase/functions/stripe-webhook
```

**Step 2: Create the webhook handler**

Create `supabase/functions/stripe-webhook/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, {
      status: 400,
    });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const supabaseUserId = paymentIntent.metadata.supabase_user_id;

    if (!supabaseUserId) {
      return new Response('Missing supabase_user_id in metadata', { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('profiles')
      .update({ account_tier: 'premium' })
      .eq('id', supabaseUserId);

    if (error) {
      console.error('Failed to update account_tier:', error);
      return new Response('Database update failed', { status: 500 });
    }

    console.log(`Upgraded user ${supabaseUserId} to premium`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Step 3: Deploy**

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Step 4: Configure Stripe webhook**

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events: `payment_intent.succeeded`
- Copy the **Signing secret** (`whsec_...`)

**Step 5: Set webhook secret**

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

**Step 6: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: add stripe-webhook Edge Function"
```

---

## Task 6: Hot Gigs Padlock Overlay

**Files:**
- Modify: `app/(musician)/home.tsx`

**Step 1: Add padlock overlay to the Hot Gigs section**

In `app/(musician)/home.tsx`, import `Lock` and `router`:

```typescript
import { Flame, TrendingUp, MessageCircleQuestion, X, Lock } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
```

Add `profile` from authStore:

```typescript
const profile = useAuthStore((s) => s.profile);
```

Add the `isPremium` check and padlock overlay inside the Hot Gigs section, after the existing `hotGigsContent` View and before the closing `</View>` of `hotGigsSection`:

```typescript
{/* Premium padlock — shown to non-premium users */}
{!isPremium && (
  <View style={[StyleSheet.absoluteFillObject, styles.padlockOverlay]}>
    <Lock size={32} color={Colors.text} />
    <Text variant="titleMedium" style={styles.padlockTitle}>Get Premium to unlock</Text>
    <Pressable
      style={styles.upgradeButton}
      onPress={() => router.push('/(musician)/upgrade')}
    >
      <Text style={styles.upgradeButtonText}>Upgrade Now →</Text>
    </Pressable>
  </View>
)}
```

Where `isPremium` is derived:

```typescript
const isPremium = profile?.account_tier === 'premium';
```

**Step 2: Add padlock styles**

```typescript
padlockOverlay: {
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(251, 249, 254, 0.82)',
  borderRadius: 20,
  gap: Spacing.sm,
},
upgradeButton: {
  marginTop: Spacing.xs,
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.sm,
  backgroundColor: Colors.primary,
  borderRadius: 20,
},
upgradeButtonText: {
  color: '#FFFFFF',
  fontWeight: '600',
  fontSize: 14,
},
padlockTitle: {
  color: Colors.text,
  fontWeight: '600',
},
```

**Step 3: Verify**

Run app as a basic user — should see padlock. Manually set `account_tier = 'premium'` in Supabase for your test user, reload — padlock should vanish.

**Step 4: Commit**

```bash
git add app/(musician)/home.tsx
git commit -m "feat: add premium padlock overlay to Hot Gigs"
```

---

## Task 7: Wire Up Upgrade Screen with Stripe PaymentSheet

**Files:**
- Modify: `app/(musician)/upgrade.tsx`

**Step 1: Replace upgrade.tsx with wired version**

```typescript
import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';

const BASIC_FEATURES = [
  'Browse open gigs',
  'Search by instrument & location',
  'Basic profile',
  'Apply to 3 gigs/month',
];

const PREMIUM_FEATURES = [
  'Everything in Basic',
  'Unlimited gig applications',
  'Priority in search results',
  'Direct messaging with churches',
  'Profile badge & verification',
  'Early access to new gigs',
  'Hot Gigs — highest-paying opportunities',
];

export default function UpgradeScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPremium = profile?.account_tier === 'premium';

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Get payment details from Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { clientSecret, ephemeralKey, customerId, error: fnError } = await response.json();
      if (fnError) throw new Error(fnError);

      // 2. Initialize PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'OnSpace',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { email: session?.user?.email },
        appearance: {
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            componentBackground: Colors.surface,
            componentBorder: Colors.border,
            primaryText: Colors.text,
            secondaryText: Colors.textSecondary,
          },
        },
      });

      if (initError) throw new Error(initError.message);

      // 3. Present PaymentSheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return; // User cancelled — do nothing
      }

      // 4. Payment succeeded — refresh profile (webhook may take a moment)
      // Poll for up to 5 seconds
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await fetchProfile();
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile?.account_tier === 'premium') break;
      }

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Upgrade Your Plan</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Get more gigs and stand out to churches
      </Text>

      {/* Basic Tier */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.tierHeader}>
            <Text variant="titleLarge" style={styles.tierName}>Basic</Text>
            {!isPremium && (
              <Chip compact style={styles.currentBadge} textStyle={styles.currentBadgeText}>
                Current Plan
              </Chip>
            )}
          </View>
          <Text variant="headlineLarge" style={styles.price}>Free</Text>
          <Divider style={styles.divider} />
          {BASIC_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Check size={18} color={Colors.success} />
              <Text variant="bodyMedium" style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Premium Tier */}
      <Card style={[styles.card, styles.premiumCard]}>
        <Card.Content>
          <View style={styles.tierHeader}>
            <Text variant="titleLarge" style={styles.premiumTierName}>Premium</Text>
            {isPremium ? (
              <Chip compact style={styles.activeBadge} textStyle={styles.activeBadgeText}>
                Active
              </Chip>
            ) : (
              <Chip compact style={styles.popularBadge} textStyle={styles.popularBadgeText}>
                Most Popular
              </Chip>
            )}
          </View>
          <View style={styles.priceRow}>
            <Text variant="headlineLarge" style={styles.premiumPrice}>$9.99</Text>
            <Text variant="bodyMedium" style={styles.priceUnit}>/month</Text>
          </View>
          <Divider style={styles.divider} />
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Check size={18} color={Colors.primary} />
              <Text variant="bodyMedium" style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          {!isPremium && (
            <>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
              <Button
                mode="contained"
                style={styles.upgradeButton}
                loading={loading}
                disabled={loading}
                onPress={handleUpgrade}
              >
                Upgrade to Premium
              </Button>
            </>
          )}
          {isPremium && (
            <Text style={styles.activeText}>You're on Premium. Enjoy Hot Gigs! 🎵</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  title: { fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg },
  card: { marginBottom: Spacing.lg, backgroundColor: Colors.surface },
  premiumCard: { borderWidth: 2, borderColor: Colors.primary },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  tierName: { fontWeight: 'bold', color: Colors.text },
  premiumTierName: { fontWeight: 'bold', color: Colors.primary },
  currentBadge: { backgroundColor: Colors.background },
  currentBadgeText: { fontSize: 11, color: Colors.textSecondary },
  popularBadge: { backgroundColor: Colors.chipBackground },
  popularBadgeText: { fontSize: 11, color: Colors.primary },
  activeBadge: { backgroundColor: Colors.success },
  activeBadgeText: { fontSize: 11, color: '#FFFFFF' },
  price: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  premiumPrice: { fontWeight: 'bold', color: Colors.primary },
  priceUnit: { color: Colors.textSecondary, marginLeft: Spacing.xs },
  divider: { marginVertical: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  featureText: { color: Colors.text, marginLeft: Spacing.sm },
  upgradeButton: { marginTop: Spacing.lg },
  errorText: { color: Colors.error, marginTop: Spacing.sm, textAlign: 'center' },
  activeText: { color: Colors.success, marginTop: Spacing.lg, textAlign: 'center', fontWeight: '600' },
});
```

**Step 2: Add Supabase URL to `.env`**

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
```

(This should already exist in `.env` if Supabase is configured — check `lib/supabase.ts`)

**Step 3: Commit**

```bash
git add app/(musician)/upgrade.tsx
git commit -m "feat: wire Stripe PaymentSheet to upgrade screen"
```

---

## Task 8: End-to-End Test

**Step 1: Start the app**

```bash
npx expo start
```

**Step 2: Sign in as a musician**

Confirm `profile.account_tier === 'basic'` (check Supabase table if unsure).

**Step 3: Verify padlock shows**

Open the Gigs home screen. The Hot Gigs section should show the padlock overlay with "Get Premium to unlock" and an "Upgrade Now →" button.

**Step 4: Tap "Upgrade Now →"**

Should navigate to the Upgrade screen. "Upgrade to Premium" button should be visible and enabled.

**Step 5: Complete payment with test card**

Tap "Upgrade to Premium" → Stripe PaymentSheet opens → Enter:
- Card: `4242 4242 4242 4242`
- Expiry: any future date (e.g. `12/34`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any 5 digits

**Step 6: Verify profile update**

After ~2 seconds, Supabase Dashboard → Table Editor → profiles → confirm `account_tier = 'premium'` for the test user.

**Step 7: Verify padlock disappears**

Return to Gigs home — Hot Gigs section should be fully visible with no padlock.

**Step 8: Final commit**

```bash
git add .
git commit -m "feat: complete Stripe premium subscription integration"
```
