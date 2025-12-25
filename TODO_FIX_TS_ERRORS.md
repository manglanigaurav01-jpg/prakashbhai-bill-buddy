# TODO: Fix TypeScript Errors

## Errors to Fix
1. **BackupManager.tsx**: Remove unused 'TrendingUp' import (line 5).
2. **comprehensive-backup.ts**:
   - Remove unused 'requestStoragePermissions' function (line 38).
   - Fix 'Directory' usage: Ensure it's imported as enum, not type.
3. **filesystem.d.ts**: Update custom types to match Capacitor's API (add 'recursive' to writeFile, remove conflicting Directory type).

## Steps
- [x] Remove 'TrendingUp' from BackupManager.tsx import.
- [x] Remove 'requestStoragePermissions' function from comprehensive-backup.ts.
- [x] Update filesystem.d.ts: Remove custom Directory type, add 'recursive' to writeFile interface.
- [x] Define local Directory enum in comprehensive-backup.ts since Capacitor doesn't export it.
- [x] Run `npx tsc --noEmit --project tsconfig.app.json` to verify fixes.
