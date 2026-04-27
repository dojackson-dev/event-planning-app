// Required for web bundling via expo/AppEntry.js in monorepo context.
// Re-export ExpoRoot so the old AppEntry.js registerRootComponent call works.
export { default } from 'expo-router/build/ExpoRoot';
