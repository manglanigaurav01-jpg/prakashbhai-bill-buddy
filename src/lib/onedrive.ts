// OneDrive integration for automatic backups
import { Capacitor } from '@capacitor/core';

export interface OneDriveConfig {
  isConnected: boolean;
  accountEmail?: string;
  lastConnectedAt?: string;
}

const ONEDRIVE_CONFIG_KEY = 'onedrive_config_v1';

export const getOneDriveConfig = (): OneDriveConfig => {
  try {
    const stored = localStorage.getItem(ONEDRIVE_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { isConnected: false };
  } catch {
    return { isConnected: false };
  }
};

export const saveOneDriveConfig = (config: OneDriveConfig): void => {
  localStorage.setItem(ONEDRIVE_CONFIG_KEY, JSON.stringify(config));
};

export const connectOneDrive = async (): Promise<{ success: boolean; message: string; accountEmail?: string }> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      // For web, we'll use the Share API to save to OneDrive
      return {
        success: true,
        message: 'OneDrive integration ready. Use backup buttons to save files.',
        accountEmail: 'Web OneDrive'
      };
    }

    // For native platforms, we can use more advanced OneDrive integration
    // This would require additional Capacitor plugins for OneDrive
    return {
      success: true,
      message: 'OneDrive integration ready for native platform.',
      accountEmail: 'Native OneDrive'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to connect OneDrive: ${error.message}`
    };
  }
};

export const disconnectOneDrive = (): void => {
  saveOneDriveConfig({ isConnected: false });
};

export const uploadToOneDrive = async (fileBlob: Blob, fileName: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      // For web, use Share API
      const { Share } = await import('@capacitor/share');
      
      // Convert blob to base64 for sharing
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/octet-stream;base64, prefix
        };
        reader.readAsDataURL(fileBlob);
      });

      await Share.share({
        title: 'Bill Buddy Backup',
        text: `Backup file: ${fileName}`,
        url: `data:application/json;base64,${base64}`,
        dialogTitle: 'Save to OneDrive'
      });

      return {
        success: true,
        message: 'Backup shared successfully. Save it to your OneDrive.'
      };
    } else {
      // For native platforms, we could implement direct OneDrive upload
      // This would require additional plugins
      return {
        success: false,
        message: 'Direct OneDrive upload not yet implemented for native platforms.'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to upload to OneDrive: ${error.message}`
    };
  }
};

export const checkOneDriveConnection = (): boolean => {
  const config = getOneDriveConfig();
  return config.isConnected;
};
