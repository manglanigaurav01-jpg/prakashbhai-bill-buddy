import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fefdfaed58db469497b3784882c36196',
  appName: 'prakashbhai-bill-buddy',
  webDir: 'dist',
  android: {
    minSdkVersion: 23,
    compileSdkVersion: 35,
    targetSdkVersion: 34,
    buildOptions: {
      javaVersion: '17'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3449be',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    Filesystem: {
      iosStorageLocation: 'Documents',
      androidStorageLocation: 'Documents'
    }
  }
};

export default config;