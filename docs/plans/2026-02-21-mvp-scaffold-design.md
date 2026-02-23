# OnSpace App — MVP Scaffold Design

**Date:** 2026-02-21
**App:** Worship musician ↔ church marketplace (React Native / Expo Router)

## Purpose

Two-sided marketplace connecting worship musicians with churches that need musicians. Musicians create profiles listing their instruments and availability. Churches post gig opportunities. Both sides search, browse, and eventually message and book.

## Architecture

**Approach:** Role-based tab navigation using Expo Router route groups.

After auth, the user's role (musician or church) determines which tab group they enter:
- `(auth)/` — login, register, onboarding
- `(musician)/` — home feed, search churches, profile, messages (stub), settings
- `(church)/` — browse musicians, post gigs, profile, messages (stub), settings

Shared screens (conversation, public profile) live outside the tab groups.

## File Structure

```
app/
├── _layout.tsx
├── index.tsx
├── (auth)/ — login, register, onboarding
├── (musician)/ — home, search, profile, messages, settings
├── (church)/ — home, post-gig, profile, messages, settings
├── conversation/[id].tsx
└── public-profile/[id].tsx

lib/ — supabase client, auth helpers, types
stores/ — Zustand auth store
components/ — ProfileCard, GigCard, MessageBubble, RoleSelector
constants/ — instruments enum, theme
assets/images/ — app icon
```

## Database Schema (Supabase)

### profiles
- id (uuid, PK, FK → auth.users)
- role ('musician' | 'church')
- display_name, bio, avatar_url
- location_city, location_state
- created_at

### musician_details
- id (uuid, PK, FK → profiles)
- instruments (text[]) — vocals, guitar, bass, drums, keys, audio_tech, other
- experience_years (int), available (bool), rate_per_service (numeric)

### church_details
- id (uuid, PK, FK → profiles)
- denomination, worship_style, congregation_size, website_url

### gigs
- id (uuid, PK), church_id (FK → profiles)
- title, description, instruments_needed (text[])
- date, time, pay_offered, status ('open' | 'filled' | 'cancelled')
- created_at

### conversations + messages (deferred — stub only in MVP)

## MVP Scope

Working in MVP:
1. Auth — email/password via Supabase Auth, role selection at registration
2. Onboarding — profile setup (name, bio, location, role-specific fields)
3. Search/Browse — musicians browse gigs, churches browse musicians (filter by instrument, location)
4. Gig posting — churches create gig posts
5. Public profiles — view another user's profile
6. State — Zustand for auth, Supabase client for data

Deferred: messaging, Stripe payments, push notifications, media uploads, maps, calendar sync.

## Tech Stack

- Expo SDK 53 + Expo Router 5 (file-based routing)
- TypeScript (strict)
- Supabase (auth + Postgres + real-time later)
- Zustand (state management)
- React Native Paper (UI components)
- NativeWind (styling, if configured)
- Lucide React Native (icons)
