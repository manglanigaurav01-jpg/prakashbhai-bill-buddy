import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runMigrationsIfNeeded } from '@/lib/versioning'
import { initializeAppPermissions } from '@/lib/permissions'

// IMPORTANT: Update this version when releasing changes that affect stored data shape
const APP_VERSION = '1.0.0'

// Initialize permissions and then kick off data migrations before rendering the app
initializeAppPermissions().then(() => {
  runMigrationsIfNeeded(APP_VERSION).finally(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
});
