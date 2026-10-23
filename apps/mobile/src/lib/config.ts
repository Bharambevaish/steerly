import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  appName?: string;
  defaultSchoolId?: string;
  eas?: { projectId?: string };
};

export const APP_NAME: string = process.env.EXPO_PUBLIC_APP_NAME || extra.appName || Constants.expoConfig?.name || 'Steerly';

/** When set, the app is locked to one school (white-label build) and skips the school picker. */
export const DEFAULT_SCHOOL_ID: string = process.env.EXPO_PUBLIC_SCHOOL_ID || extra.defaultSchoolId || '';

export const EAS_PROJECT_ID: string | undefined = extra.eas?.projectId || undefined;

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

/** Where owners/staff manage their school. */
export const ADMIN_URL: string = process.env.EXPO_PUBLIC_ADMIN_URL || 'https://admin.steerly.app';

/** Build-time brand (APP_BRAND_COLOR) until the school's own brandColor loads. */
// Only trust a real "#RRGGBB" string: on web the manifest's extra values aren't guaranteed to be strings.
const configuredBrand: unknown = (Constants.expoConfig?.extra as { brandColor?: unknown } | undefined)?.brandColor;
export const DEFAULT_BRAND: string =
  typeof configuredBrand === 'string' && /^#[0-9a-f]{6}$/i.test(configuredBrand) ? configuredBrand : '#F59E0B';
