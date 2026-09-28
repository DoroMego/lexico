// Database layer — automatically selects platform-specific implementation
// On web: uses IndexedDB (db.web.ts)
// On native: uses expo-sqlite (db.native.ts)

export * from './db.native';
