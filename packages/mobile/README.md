# Mobile App - Event Planning

This is the React Native mobile app built with Expo.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS Simulator (Xcode) or physical iOS device
- Apple Developer account (for TestFlight)

## Getting Started

1. Install dependencies:
```bash
cd packages/mobile
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on iOS:
```bash
npm run ios
```

## Building for TestFlight

### 1. Login to Expo
```bash
eas login
```

### 2. Configure Build
Update `eas.json` with your Apple Developer credentials:
- `appleId`: Your Apple ID email
- `ascAppId`: App Store Connect App ID (from App Store Connect)
- `appleTeamId`: Your Apple Developer Team ID

### 3. Build for iOS
```bash
eas build --platform ios --profile production
```

### 4. Submit to TestFlight
```bash
eas submit --platform ios --latest
```

## Environment Variables

The app uses the following environment variables (configured in `.env`):
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## App Structure

```
app/
├── _layout.tsx           # Root layout
├── index.tsx            # Entry point (redirects to login)
├── (auth)/              # Authentication screens
│   ├── _layout.tsx
│   └── login.tsx
└── (tabs)/              # Main app tabs
    ├── _layout.tsx
    ├── events.tsx
    ├── bookings.tsx
    └── profile.tsx
lib/
└── supabase.ts          # Supabase client configuration
```

## Features

- Authentication with Supabase
- Events listing
- Bookings management
- User profile
- Secure session storage with AsyncStorage

## Notes

- Bundle ID: `com.eventplanning.app`
- Version: 1.0.0
- Minimum iOS version: 13.0
