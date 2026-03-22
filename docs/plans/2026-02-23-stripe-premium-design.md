# Stripe Premium Subscription — Design

**Date:** 2026-02-23
**Status:** Approved
**Scope:** Hot Gigs padlock UI + Stripe PaymentSheet + Supabase Edge Functions

---

## Overview

Musicians can upgrade to a $9.99/month Premium plan. The Hot Gigs section on the home screen is locked behind a padlock overlay for basic users. Tapping "Upgrade Now" navigates to the upgrade screen, which opens a native Stripe PaymentSheet. On successful payment, Supabase updates the user's `account_tier` to `'premium'` via a webhook, and the padlock disappears.

---

## Payment Flow

```
User taps "Upgrade Now" on Hot Gigs padlock
        ↓
Navigates to /(musician)/upgrade
        ↓
Taps "Upgrade to Premium"
        ↓
App calls Supabase Edge Function: create-payment-intent
        ↓
Edge Function → Stripe API
  - Creates or retrieves Stripe Customer (keyed by Supabase user ID)
  - Creates PaymentIntent for $9.99 USD
  - Returns { clientSecret, ephemeralKey, customerId }
        ↓
App initializes and presents Stripe PaymentSheet
        ↓
User completes payment (test card: 4242 4242 4242 4242)
        ↓
Stripe sends webhook event: payment_intent.succeeded
        ↓
Supabase Edge Function: stripe-webhook
  - Validates Stripe-Signature header
  - Extracts Supabase user ID from PaymentIntent metadata
  - Updates profiles.account_tier = 'premium'
        ↓
App calls authStore.fetchProfile()
        ↓
Hot Gigs padlock disappears
```

---

## Database Changes

```sql
-- Migration to run in Supabase SQL Editor
ALTER TABLE public.profiles
  ADD COLUMN account_tier TEXT NOT NULL DEFAULT 'basic'
  CHECK (account_tier IN ('basic', 'premium'));

-- Edge Function needs service_role key to bypass RLS for webhook update
-- Grant is implicit via service_role — no additional policy needed
```

---

## Supabase Edge Functions

### `create-payment-intent`
- **Auth:** Requires valid Supabase JWT (`Authorization: Bearer <token>`)
- **Logic:**
  1. Extract `user.id` from JWT
  2. Look up or create Stripe Customer with `metadata.supabase_user_id = user.id`
  3. Create `EphemeralKey` for the customer
  4. Create `PaymentIntent` ($9.99 USD, `currency: 'usd'`) with `metadata.supabase_user_id`
  5. Return `{ clientSecret, ephemeralKey, customerId, publishableKey }`
- **Env vars:** `STRIPE_SECRET_KEY`

### `stripe-webhook`
- **Auth:** Public endpoint, verified via `Stripe-Signature` header
- **Logic:**
  1. Parse raw body, verify signature with `stripe.webhooks.constructEvent`
  2. Handle `payment_intent.succeeded` event only
  3. Read `supabase_user_id` from `event.data.object.metadata`
  4. Update `profiles SET account_tier = 'premium' WHERE id = supabase_user_id` using service role client
- **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`

---

## App Changes (5 files)

### `lib/types.ts`
Add `account_tier: AccountTier` to `Profile` interface. `AccountTier` is already defined.

### `app/(musician)/home.tsx`
On the Hot Gigs glass banner, add a padlock overlay when `profile?.account_tier !== 'premium'`:
- `Lock` icon (lucide)
- "Get Premium to unlock" label
- "Upgrade Now →" button → `router.push('/(musician)/upgrade')`
- Overlay sits above `BlurView` layer, covers entire `hotGigsSection`

### `app/(musician)/upgrade.tsx`
Wire the existing "Upgrade to Premium" button:
1. Call `create-payment-intent` Edge Function with user JWT
2. Call `initPaymentSheet()` with returned values
3. Call `presentPaymentSheet()`
4. On success: call `authStore.fetchProfile()`, show success toast, navigate back

### `stores/authStore.ts`
No structural change. `fetchProfile` already uses `select('*')` so `account_tier` will be fetched automatically once the column exists.

### `docs/supabase-schema.sql`
Add `account_tier` column to the profiles table definition.

---

## Environment Variables Required

| Variable | Where set | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Supabase Edge Function secrets | `sk_test_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function secrets | `whsec_...` from Stripe webhook config |
| `STRIPE_PUBLISHABLE_KEY` | App `.env` | `pk_test_...` returned by Edge Function or hardcoded |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets (already present) | For bypassing RLS in webhook |

---

## Testing

- Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
- Use Stripe CLI `stripe listen --forward-to <edge-function-url>` to test webhook locally
- Verify `profiles.account_tier` flips to `'premium'` in Supabase dashboard after payment

---

## Out of Scope (Future)

- Apple/Google IAP (required for App Store distribution of digital goods)
- Subscription cancellation / downgrade flow
- Trial periods or discount codes
