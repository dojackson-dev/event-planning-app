# TestFlight Deployment Guide

This guide covers submitting the Event Planning mobile app to TestFlight using Expo Application Services (EAS).

## Prerequisites

1. **Apple Developer Account** - $99/year membership
2. **App Store Connect Access** - Create an app listing
3. **Apple Credentials:**
   - Apple ID (your developer account email)
   - ASC App ID (from App Store Connect)
   - Apple Team ID (from Apple Developer portal)

## Step 1: Get Your Apple Credentials

### Apple ID
Your developer account email address.

### ASC App ID (App Store Connect App ID)
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to "My Apps"
3. Create a new app or select your existing app
4. The App ID is in the "App Information" section (10-digit number)

### Apple Team ID
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click on "Membership" in the sidebar
3. Your Team ID is displayed there (10-character alphanumeric)

## Step 2: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 3: Login to Expo

```bash
cd packages/mobile
eas login
```

## Step 4: Configure Build

The `eas.json` file is already configured. You need to update it with your Apple credentials:

1. Open `eas.json`
2. Update the `submit.production.ios` section:
   - `appleId`: Your Apple ID email
   - `ascAppId`: Your App Store Connect App ID (10 digits)
   - `appleTeamId`: Your Apple Team ID (10 characters)

## Step 5: Build for Production

Build the iOS app for production:

```bash
cd packages/mobile
eas build --platform ios --profile production
```

This will:
- Create a production build on Expo's servers
- Generate an `.ipa` file
- Take 10-20 minutes to complete
- Provide a URL to track the build progress

## Step 6: Submit to TestFlight

After the build completes, submit to TestFlight:

```bash
eas submit --platform ios --latest
```

You'll be prompted for:
- Apple ID
- App-specific password (if 2FA is enabled)
- Team selection (if you have multiple teams)

### Creating an App-Specific Password

If you have 2-factor authentication enabled:

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to "Security" section
4. Under "App-Specific Passwords", click "Generate password"
5. Name it "EAS CLI" or similar
6. Save the generated password

## Step 7: Wait for Processing

After submission:
1. The app will appear in App Store Connect
2. Apple will process the build (15-60 minutes)
3. You'll receive an email when processing is complete
4. The build will be available in TestFlight

## Step 8: Configure TestFlight

In App Store Connect:

1. Go to "TestFlight" tab
2. Add internal testers (up to 100)
3. Add external testers (requires Apple review for first build)
4. Configure test information and privacy policy

## Alternative: Manual Submission

If `eas submit` fails, you can manually upload:

```bash
# Download the .ipa file from the build URL
# Then use Transporter app (from Mac App Store)
# Or use Application Loader
```

## Build Profiles

### Development
```bash
eas build --platform ios --profile development
```
- For development devices
- Includes dev tools

### Preview
```bash
eas build --platform ios --profile preview
```
- Internal distribution
- No simulator support

### Production
```bash
eas build --platform ios --profile production
```
- For App Store/TestFlight
- Optimized and signed

## Troubleshooting

### Build Fails
- Check your `app.json` for valid bundle identifier
- Ensure all required iOS assets exist (icon, splash screen)
- Verify Expo SDK compatibility

### Submit Fails
- Verify Apple ID credentials
- Ensure the app exists in App Store Connect
- Check that bundle identifier matches App Store Connect
- Verify Team ID is correct

### Processing Stuck
- Apple's processing can take up to an hour
- Check email for any rejection notices
- Review App Store Connect for status updates

## Version Management

When releasing updates:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1",
   "ios": {
     "buildNumber": "2"
   }
   ```

2. Rebuild and resubmit:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect](https://appstoreconnect.apple.com)
