import { CapacitorConfig } from '@capacitor/cli';



const config: CapacitorConfig = {

  appId: 'app.lovable.fefdfaed58db469497b3784882c36196',

  appName: 'prakashbhai-bill-buddy',

  webDir: 'dist',

  server: {

    url: 'https://fefdfaed-58db-4694-97b3-784882c36196.lovableproject.com?forceHideBadge=true',

    cleartext: true

  },

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

    }

  }

};



export default config;