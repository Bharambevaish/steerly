// White-label config. app.json holds the defaults; per-school builds override them with env vars:
//   EXPO_PUBLIC_APP_NAME   display name (default "Steerly")
//   EXPO_PUBLIC_SCHOOL_ID  lock the app to one school (skips the school picker)
//   APP_SLUG / APP_BUNDLE_ID / EAS_PROJECT_ID  optional, for separate store listings
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const name = process.env.EXPO_PUBLIC_APP_NAME?.trim() || config.name || 'Steerly';
  const bundleId = process.env.APP_BUNDLE_ID?.trim();
  const projectId = process.env.EAS_PROJECT_ID?.trim() || config.extra?.eas?.projectId || undefined;

  return {
    ...config,
    name,
    slug: process.env.APP_SLUG?.trim() || config.slug || 'steerly',
    ios: { ...config.ios, ...(bundleId ? { bundleIdentifier: bundleId } : {}) },
    android: { ...config.android, ...(bundleId ? { package: bundleId } : {}) },
    extra: {
      ...config.extra,
      appName: name,
      defaultSchoolId: process.env.EXPO_PUBLIC_SCHOOL_ID?.trim() || config.extra?.defaultSchoolId || '',
      eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) },
    },
  };
};
