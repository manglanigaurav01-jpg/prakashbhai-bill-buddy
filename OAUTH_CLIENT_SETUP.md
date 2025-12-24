# OAuth Client ID Setup Guide

## Important: You Need a WEB Application Client ID (Not Installed)

The JSON file you provided shows an "installed" client type, but for Firebase Authentication and Capacitor Google Auth, you need a **Web application** client ID.

## Current Configuration Status

### What You Have:
- ✅ Android client ID: `491579424292-uvcgap1os7gbhj10jnakcg308gthland.apps.googleusercontent.com` (in google-services.json)
- ✅ Web client ID (old): `491579424292-96mflt0oeh6m50pvdgokapi718puocuh.apps.googleusercontent.com` (in google-services.json)
- ❌ Installed client ID: `491579424292-lj1p8pffpcp9262m7uaucjlav3jg96b2.apps.googleusercontent.com` (not suitable for web/mobile web)

### What's Currently in Code:
- `capacitor.config.ts` serverClientId: `491579424292-96mf2l65h34g6ld29qngoc3sf2qe2v73.apps.googleusercontent.com`

## Step-by-Step: Create Web Application OAuth Client ID

### Option 1: Create via Google Cloud Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **prakashbhai-bill-buddy-85123**
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: **Prakashbhai Bill Manager**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes: `email`, `profile`
   - Click **Save and Continue**
   - Add test users if needed
   - Click **Save and Continue**
6. Back to Credentials, select **Application type**: **Web application**
7. Name: **Bill Buddy Web Client**
8. **Authorized JavaScript origins** (add these):
   ```
   http://localhost
   http://localhost:8080
   https://prakashbhai-bill-buddy-85123.firebaseapp.com
   ```
   (Add your production domain when you deploy)
9. **Authorized redirect URIs** (add these):
   ```
   http://localhost
   http://localhost:8080
   https://prakashbhai-bill-buddy-85123.firebaseapp.com/__/auth/handler
   ```
10. Click **Create**
11. **Copy the Client ID** (it will look like: `491579424292-xxxxxxxxxxxxx.apps.googleusercontent.com`)

### Option 2: Use Firebase Console (Easier)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **prakashbhai-bill-buddy-85123**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Under **Web SDK configuration**, you'll see **Web client ID**
6. Copy this Client ID
7. Make sure **Authorized domains** includes:
   - `localhost`
   - Your production domain (when deployed)

## Update Code with New Web Client ID

Once you have the **Web application** client ID, update `capacitor.config.ts`:

```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: 'YOUR_NEW_WEB_CLIENT_ID_HERE.apps.googleusercontent.com', // Web client ID
  forceCodeForRefreshToken: true
}
```

## Important Notes

1. **Do NOT use the "installed" client ID** - It won't work for web/mobile web authentication
2. **Web client ID is different from Android client ID** - Android uses google-services.json
3. **serverClientId in Capacitor** must be a **Web application** client ID
4. **Authorized domains** must include `localhost` for development

## Verify Setup

After updating:

1. **Firebase Console** → **Authentication** → **Settings**:
   - Check **Authorized domains** includes `localhost`
   - Verify **Web client ID** matches what you put in capacitor.config.ts

2. **Google Cloud Console** → **APIs & Services** → **Credentials**:
   - Verify **Web application** client has correct authorized origins
   - Verify redirect URIs are correct

3. **Test sign-in**:
   - Run app: `npm run dev`
   - Try signing in with Google
   - Check browser console for any errors

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Add `http://localhost:8080` to authorized redirect URIs in Google Cloud Console

### Error: "unauthorized_client"
- **Solution**: Ensure you're using a **Web application** client ID (not installed)

### Error: "access_denied"
- **Solution**: Check OAuth consent screen is configured and published

### Sign-in works on web but not mobile
- **Solution**: Ensure `serverClientId` in capacitor.config.ts matches the Web client ID

## Current Status

- ✅ Firebase project configured
- ✅ Android client configured (google-services.json)
- ⚠️ Need to create/verify Web application client ID
- ⚠️ Need to update capacitor.config.ts with correct Web client ID
- ⚠️ Need to verify authorized domains in Firebase Console

