# SoundBridge

SoundBridge is a cross-platform mobile and web app that connects musicians with churches seeking worship talent. Musicians browse and apply for gigs; churches post opportunities and hire. The app runs on iOS, Android, and web via React Native and Expo.

## Features

- **Gig Marketplace** — Musicians filter gigs by instrument, location, date, and pay rate, then apply directly through the app
- **Church Profiles** — Churches post gig details including compensation, required instruments, denomination, and worship style
- **Messaging** — Real-time chat between musicians and churches
- **Payments** — Stripe integration for gig bookings and premium account upgrades
- **Authentication** — Firebase Auth with role-based access for musicians and churches

## Tech Stack

**Frontend**
- React Native 0.81.5 with Expo 54
- Expo Router (file-based navigation)
- TypeScript 5.9
- NativeWind (Tailwind CSS for React Native)
- Zustand (auth state), Apollo Client (GraphQL)

**Backend & Services**
- Firebase — Firestore, Auth, Cloud Functions
- Stripe — payments
- GraphQL + Apollo

**UI**
- React Native Paper, React Native Elements
- Lucide React Native icons
- Lottie animations

## Project Structure

```
soundbridge/
├── app/               # Expo Router screens and navigation
│   ├── (auth)/        # Login, register, onboarding
│   ├── (musician)/    # Musician tabs: home, search, profile, messages
│   └── public-profile/
├── components/        # Shared UI components (GigCard, ProfileCard, etc.)
├── stores/            # Zustand state (authStore)
├── lib/               # Firebase client, TypeScript types
├── constants/         # Theme, instrument lists
├── functions/         # Firebase Cloud Functions (Node.js/TypeScript)
└── assets/            # Images and icons
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Firestore and Auth enabled
- Stripe account (for payments)

### Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net
```

Place your Firebase config files in the project root:
- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

### Install and Run

```bash
npm install

npm run start      # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
```

### Firebase Functions

```bash
cd functions
npm install
npm run serve      # Local emulation
npm run deploy     # Deploy to Firebase
```

### Lint

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

## License

Private. Contact the author for collaboration inquiries.
