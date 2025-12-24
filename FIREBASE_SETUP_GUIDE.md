# Firebase Setup Guide for Bill Buddy

This guide will help you configure Firebase for cloud backup and authentication features.

## Prerequisites
- A Google account
- Access to Firebase Console (https://console.firebase.google.com/)

## Step 1: Create/Verify Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. If you don't have a project, click "Add project"
3. Project name: `prakashbhai-bill-buddy-85123` (or create new)
4. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google** as a sign-in provider:
   - Click on "Google"
   - Toggle "Enable"
   - Enter project support email
   - Click "Save"

## Step 3: Configure OAuth Consent Screen (Google Cloud Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Configure:
   - User Type: External (for public use)
   - App name: "Prakashbhai Bill Manager"
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`
   - Add test users if needed (for testing)
   - Click "Save and Continue"

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. If you don't have a web app, click "Add app" → Web (</> icon)
4. Register app with nickname: "Bill Buddy Web"
5. Copy the Firebase configuration object

## Step 5: Update Firebase Configuration in Code

The current configuration is in `src/lib/firebase.ts`:

```typescript
const config = {
  apiKey: "AIzaSyCD-kUBQCrz7kuNYHewynw1-8blwZsQb4w",
  authDomain: "prakashbhai-bill-buddy-85123.firebaseapp.com",
  projectId: "prakashbhai-bill-buddy-85123",
  storageBucket: "prakashbhai-bill-buddy-85123.firebasestorage.app",
  messagingSenderId: "491579424292",
  appId: "1:491579424292:android:93a7e573e3498a6cdee2b1"
};
```

**If you created a new project, update these values in:**
- `src/lib/firebase.ts`
- `src/lib/firebase.config.ts`

## Step 6: Configure Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose:
   - Start in **test mode** (for development)
   - Select a location (choose closest to your users)
   - Click "Enable"

## Step 7: Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules**
2. Update rules to allow authenticated users:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/sync/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 8: Add Authorized Domains (for Web)

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (e.g., `yourdomain.com`)

## Step 9: Configure Android App (if using Capacitor)

1. In Firebase Console, go to **Project Settings** → **Your apps**
2. Click "Add app" → Android
3. Register Android app:
   - Package name: `com.prakashbhai.billbuddy` (from capacitor.config.ts)
   - App nickname: "Bill Buddy Android"
   - Download `google-services.json`
   - Place it in `android/app/` directory

## Step 10: Test Authentication

1. Run the app: `npm run dev`
2. Go to Settings → Cloud Sync
3. Click "Sign in with Google"
4. Complete Google sign-in
5. Verify you're signed in

## Troubleshooting

### Issue: "Sign-in failed" or "Popup blocked"
- **Solution**: Check authorized domains in Firebase Console
- Ensure `localhost` is added for development
- Check browser console for specific error codes

### Issue: "Permission denied" when syncing
- **Solution**: Check Firestore security rules
- Ensure user is authenticated (`request.auth != null`)
- Verify user ID matches document path

### Issue: "Network error" or timeout
- **Solution**: Check internet connection
- Verify Firebase project is active
- Check Firebase Console for service status

### Issue: Mobile sign-in not working
- **Solution**: Ensure redirect flow is enabled
- Check `capacitor.config.ts` has correct app ID
- Verify `google-services.json` is in correct location

## Current Firebase Project Details

- **Project ID**: `prakashbhai-bill-buddy-85123`
- **Auth Domain**: `prakashbhai-bill-buddy-85123.firebaseapp.com`
- **Database**: Firestore (NoSQL)

## Security Best Practices

1. **Never commit** Firebase API keys to public repositories
2. Use environment variables for sensitive config
3. Regularly review Firestore security rules
4. Monitor authentication usage in Firebase Console
5. Set up billing alerts if using paid Firebase features

## Next Steps

After setup:
1. Test sign-in on web
2. Test sign-in on mobile (Android/iOS)
3. Test cloud backup/restore
4. Monitor Firebase Console for usage
5. Set up error tracking (optional)

## Support

If you encounter issues:
1. Check Firebase Console → Project Settings → General
2. Review error messages in browser console
3. Check Firebase status page: https://status.firebase.google.com/
4. Review Firebase documentation: https://firebase.google.com/docs

