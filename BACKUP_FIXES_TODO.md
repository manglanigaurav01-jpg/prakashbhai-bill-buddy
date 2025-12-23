# Backup and Cloud Sync Fixes - TODO List

## Phase 1: Consolidate Backup Systems
- [ ] Remove conflicting backup.ts implementation
- [ ] Update BackupManager.tsx to use only enhanced-backup.ts
- [ ] Ensure all backup creation goes through enhanced-backup.ts
- [ ] Test backup generation on both web and mobile

## Phase 2: Fix Cloud Authentication
- [ ] Fix Firebase authentication session management
- [ ] Improve error handling in firebase.ts
- [ ] Add proper timeout handling for auth operations
- [ ] Clear stale auth sessions on sign-in

## Phase 3: Fix Cloud Upload/Sync
- [ ] Fix sync-retry.ts permission checking
- [ ] Improve network status detection
- [ ] Add better error messages for sync failures
- [ ] Fix cloud.ts data push/pull operations

## Phase 4: Improve User Experience
- [ ] Add loading states during backup operations
- [ ] Better error messages in UI components
- [ ] Progress indicators for long operations
- [ ] Clear feedback when operations succeed/fail

## Phase 5: Testing and Validation
- [ ] Test backup creation and restoration
- [ ] Test cloud sign-in and sync
- [ ] Test on both web and mobile platforms
- [ ] Validate data integrity after restore
