import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prakashbhai.billbuddy',
  appName: 'Prakashbhai Bill Manager',
  webDir: 'dist',
  android: {
    path: undefined,
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3449be',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    App: {},
    Filesystem: {
      iosStorageLocation: 'Documents',
      androidStorageLocation: 'External'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '491579424292-96mflt0oeh6m50pvdgokapi718puocuh.apps.googleusercontent.com', // Web client ID from Firebase
      forceCodeForRefreshToken: true
    }
  }
};

export default config;