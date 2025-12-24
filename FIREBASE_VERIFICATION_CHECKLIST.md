# Firebase Configuration Verification Checklist

## ✅ Code Updated
- [x] `capacitor.config.ts` updated with correct Web client ID: `491579424292-96mflt0oeh6m50pvdgokapi718puocuh.apps.googleusercontent.com`

## Required Firebase Console Checks

### 1. Authentication → Sign-in Method
- [ ] Go to Firebase Console → Authentication → Sign-in method
- [ ] Click on **Google** provider
- [ ] Verify it's **Enabled**
- [ ] Check **Web client ID** matches: `491579424292-96mflt0oeh6m50pvdgokapi718puocuh.apps.googleusercontent.com`

### 2. Authentication → Settings → Authorized Domains
- [ ] Go to Firebase Console → Authentication → Settings
- [ ] Scroll to **Authorized domains** section
- [ ] Verify these domains are listed:
  - ✅ `localhost` (for development)
  - ✅ `prakashbhai-bill-buddy-85123.firebaseapp.com` (Firebase hosting)
  - Add your production domain when you deploy

### 3. Google Cloud Console → OAuth Client
- [ ] Go to Google Cloud Console → APIs & Services → Credentials
- [ ] Find the Web client: `491579424292-96mflt0oeh6m50pvdgokapi718puocuh`
- [ ] Verify **Authorized JavaScript origins** includes:
  - ✅ `http://localhost`
  - ✅ `http://localhost:5000`
  - ⚠️ **ADD**: `http://localhost:8080` (for dev server)
  - ✅ `https://prakashbhai-bill-buddy-85123.firebaseapp.com`
- [ ] Verify **Authorized redirect URIs** includes:
  - ✅ `https://prakashbhai-bill-buddy-85123.firebaseapp.com/__/auth/handle`

### 4. Firestore Database → Rules
- [ ] Go to Firebase Console → Firestore Database → Rules
- [ ] Verify rules allow authenticated users:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sync/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Testing Steps

1. **Test Web Sign-in**:
   ```bash
   npm run dev
   ```
   - Open http://localhost:8080
   - Go to Settings → Cloud Sync
   - Click "Sign in with Google"
   - Should redirect to Google sign-in
   - After signing in, should return to app

2. **Test Mobile Sign-in**:
   - Build Android app: `npm run build:android`
   - Open app on device
   - Try signing in with Google
   - Should work with redirect flow

3. **Test Cloud Backup**:
   - After signing in, try uploading data to cloud
   - Try downloading data from cloud
   - Verify data syncs correctly

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Add `http://localhost:8080` to Authorized JavaScript origins in Google Cloud Console

### Issue: "unauthorized_client"
**Solution**: Verify you're using the Web client ID (not installed client ID)

### Issue: Sign-in popup closes immediately
**Solution**: 
- Check authorized domains in Firebase Console
- Verify `localhost` is in the list
- Clear browser cache and try again

### Issue: "access_denied" or "popup_blocked"
**Solution**:
- Check OAuth consent screen is configured
- Verify scopes are correct: `email`, `profile`
- Try using redirect flow instead of popup (already implemented for mobile)

## Current Configuration Summary

✅ **Web Client ID**: `491579424292-96mflt0oeh6m50pvdgokapi718puocuh.apps.googleusercontent.com`
✅ **Android Client ID**: `491579424292-uvcgap1os7gbhj10jnakcg308gthland.apps.googleusercontent.com`
✅ **Project ID**: `prakashbhai-bill-buddy-85123`
✅ **Firebase API Key**: `AIzaSyCD-kUBQCrz7kuNYHewynw1-8blwZsQb4w`

## Next Steps

1. ✅ Code is updated with correct Web client ID
2. ⚠️ Add `http://localhost:8080` to Google Cloud Console authorized origins
3. ⚠️ Verify Firebase authorized domains include `localhost`
4. ⚠️ Test sign-in on web (localhost:8080)
5. ⚠️ Test sign-in on mobile device
6. ⚠️ Test cloud backup/restore functionality

