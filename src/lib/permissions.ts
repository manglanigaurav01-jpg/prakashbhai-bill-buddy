import { Capacitor } from '@capacitor/core';

/**
 * Initialize app permissions on first launch
 * This should be called when the app starts
 */
export const initializeAppPermissions = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return; // Web doesn't need permissions
  }

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      // For Android, we need to inform users about storage permissions
      // Capacitor v8 doesn't provide programmatic permission requests
      // Users must manually grant MANAGE_EXTERNAL_STORAGE in settings
      console.log('Bill Buddy requires storage permissions for backup functionality.');
      console.log('Please grant storage access in your device settings if backups fail.');
    } else if (platform === 'ios') {
      // iOS permissions are handled through the app's plist configuration
      console.log('iOS permissions configured through app settings.');
    }
  } catch (error) {
    console.error('Error initializing permissions:', error);
  }
};

/**
 * Check if storage permissions are likely available
 * This is a best-effort check since Capacitor v8 doesn't expose permission status
 */
export const checkStoragePermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  // For Capacitor v8, we can't check permission status programmatically
  // We'll assume permissions are granted and handle errors gracefully
  return true;
};
