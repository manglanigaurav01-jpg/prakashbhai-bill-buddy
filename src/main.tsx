import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runMigrationsIfNeeded } from '@/lib/versioning'
import { initAutoBackup } from '@/lib/backup'

// IMPORTANT: Update this version when releasing changes that affect stored data shape
const APP_VERSION = '1.0.0'

// Kick off data migrations and initialize auto-backup before rendering the app
runMigrationsIfNeeded(APP_VERSION).finally(() => {
  // Initialize automatic backup system
  initAutoBackup();
  
  createRoot(document.getElementById("root")!).render(<App />);
});
