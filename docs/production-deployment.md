# Production Deployment Guide — soundbridge-app

**App:** `com.soundbridge.app` | **EAS Project:** `nmartinezdev/soundbridge-app`
**Current version:** `1.0.0-beta.1` (versionCode 1 / buildNumber 1)

---

## Pre-Production Checklist

Complete these before submitting to any store.

### Environment & Secrets
- [ ] Switch Stripe from test keys (`sk_test_...`) to live keys (`sk_live_...`) in EAS secrets
  ```
  eas secret:create --scope project --name STRIPE_SECRET_KEY --value sk_live_xxx
  eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value pk_live_xxx
  ```
- [ ] Verify Firebase Security Rules are production-hardened (no `allow read, write: if true;`)
- [ ] Confirm Firebase project is on the Blaze (pay-as-you-go) plan for production traffic
- [ ] Remove or gate any `__DEV__`-only debug UI, logging, or test accounts
- [ ] Verify `.env` — all `EXPO_PUBLIC_*` variables are set to production endpoints

### App Identity
- [ ] Confirm `app.json` `name` and `slug` are final — these cannot change after first submission
- [ ] App icon (`assets/images/app-icon.png`) is 1024×1024, no transparency (App Store requirement)
- [ ] Splash screen looks correct on both platforms
- [ ] `version` in `app.json` is the public-facing version string you want in stores (e.g., `"1.0.0"`)

### Permissions Review
Current Android permissions declared:
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`

- [ ] Confirm these are all actually used — App Store/Play Store reject apps with undeclared usage descriptions or unused permissions
- [ ] Add iOS `NSMicrophoneUsageDescription` string in `app.json` if microphone is used on iOS

---

## Android — Google Play Store

### Step 1: Create a Google Play Console account
1. Go to [play.google.com/console](https://play.google.com/console) and sign in with a Google account
2. Pay the one-time $25 developer registration fee
3. Complete account details (developer name, email, phone)

### Step 2: Create the app in Play Console
1. Click **Create app** → fill in:
   - App name: `soundbridge-app` (or your public name)
   - Default language: English
   - App or Game: App
   - Free or paid: your choice
2. Package name is locked to `com.soundbridge.app` from your first upload — cannot change

### Step 3: Build the production AAB
```bash
eas build --platform android --profile production
```
This produces an **Android App Bundle (.aab)** — not an APK. Google Play takes the AAB and generates device-optimized APKs per architecture. The `versionCode` auto-increments each build (configured in `eas.json`).

### Step 4: Complete the Play Console store listing
These sections must be 100% complete before release:

- **Store listing:** App name, short description (80 chars), full description (4000 chars), screenshots (min 2 phone screenshots), feature graphic (1024×500)
- **Content rating:** Answer the IARC questionnaire (takes ~5 min)
- **Target audience:** Set age group
- **Data safety:** Declare what data the app collects — Firebase Analytics, any user data from auth
- **App access:** If the reviewer needs a test account, provide credentials here

### Step 5: Upload the AAB
1. Navigate to **Testing → Internal testing** first to validate before full release
2. Create a release → upload the `.aab` from Step 3 (EAS provides a download link after build)
3. After internal testing passes, promote to **Production** track

### Step 6: Submit for review
Production releases take 1-7 days for initial review. Subsequent releases are usually faster.

---

## iOS — Apple App Store

### Step 1: Apple Developer account
1. Enroll at [developer.apple.com](https://developer.apple.com) — $99/year
2. Complete account verification (may take 24-48 hours for new accounts)

### Step 2: Register the app in App Store Connect
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps → +**
2. Fill in:
   - Name: your public app name
   - Bundle ID: `com.soundbridge.app` (must match `app.json` exactly)
   - SKU: any unique internal identifier (e.g., `soundbridge-app-001`)

### Step 3: Link EAS to Apple credentials
```bash
eas credentials --platform ios
```
EAS will handle provisioning profiles and certificates. Choose **Expo-managed credentials** unless you have existing Apple certificates you want to use.

### Step 4: Build the production IPA
```bash
eas build --platform ios --profile production
```
EAS builds a signed `.ipa` using your Apple credentials. `buildNumber` auto-increments each build.

### Step 5: Complete App Store Connect listing
Required before submission:
- Screenshots (6.5" iPhone required; iPad if `supportsTablet: true` is set)
- App description, keywords (100 chars), support URL, marketing URL
- Privacy policy URL (required for all apps)
- Age rating questionnaire
- App Review Information: test account credentials if your app requires login

### Step 6: Submit to TestFlight first (recommended)
1. Upload the IPA to TestFlight — EAS can do this automatically (see EAS Submit below)
2. Add internal testers → install on real devices
3. Submit for External Testing if you want beta users (requires Apple review, ~1-2 days)
4. When satisfied, submit the same build to App Store Review

### Step 7: App Store submission
1. In App Store Connect → select your build from TestFlight
2. Fill all required metadata → **Submit for Review**
3. Initial review: typically 1-3 days

---

## Automated Submission with EAS Submit

After the build completes, EAS can submit directly to both stores:

```bash
# Submit latest Android build to Play Store
eas submit --platform android --latest

# Submit latest iOS build to App Store (TestFlight)
eas submit --platform ios --latest
```

For Android, EAS Submit requires a **Google Play API service account JSON key**:
1. In Play Console → Setup → API access → link to Google Cloud project
2. Create a service account with **Release Manager** role
3. Download the JSON key → `eas secret:create --name GOOGLE_SERVICE_ACCOUNT_KEY`

For iOS, EAS Submit uses your Apple ID credentials stored via `eas credentials`.

---

## Post-Launch

### Monitoring
- Firebase Crashlytics — review crash-free rate after launch
- Firebase Analytics — track user flows, retention
- Google Play Android Vitals — ANRs and crash rate (Play Console)
- App Store Connect Analytics — downloads, retention

### App Updates
For each update:
1. Bump `version` in `app.json` (e.g., `"1.0.1"`) — the human-readable version
2. `versionCode` (Android) and `buildNumber` (iOS) auto-increment via EAS (`autoIncrement` in `eas.json`)
3. Run `eas build --platform all --profile production`
4. Run `eas submit --platform all --latest`

### OTA Updates (JavaScript-only changes)
For JS-only changes that don't touch native code, use EAS Update to push without a store review:
```bash
eas update --branch production --message "Fix: correct musician profile display"
```
This updates the JS bundle on user devices within ~24 hours without a new store submission. Not available for changes to native modules, permissions, or `app.json` plugins.

---

## Quick Reference

| Task | Command |
|------|---------|
| Production Android build | `eas build --platform android --profile production` |
| Production iOS build | `eas build --platform ios --profile production` |
| Both platforms | `eas build --platform all --profile production` |
| Submit Android to Play Store | `eas submit --platform android --latest` |
| Submit iOS to App Store | `eas submit --platform ios --latest` |
| JS-only OTA update | `eas update --branch production --message "..."` |
| View build status | `eas build:list` |
| Manage secrets | `eas secret:list` |
