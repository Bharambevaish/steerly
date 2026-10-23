// White-label config. app.json holds the Steerly defaults; every per-school build overrides them
// with env vars (set in eas.json `env`, EAS environment variables, or your shell). See README.md.
//
//   EXPO_PUBLIC_APP_NAME    display name under the icon (default "Steerly")
//   EXPO_PUBLIC_SCHOOL_ID   lock the app to one school (skips the school picker)
//   APP_SLUG                EAS/Expo project slug (must match the EAS project)
//   APP_BUNDLE_ID           Android package + iOS bundle id, e.g. app.steerly.prince
//   APP_SCHEME              deep-link scheme (default: slug without dashes)
//   EAS_PROJECT_ID          EAS project UUID (needed for push tokens and builds)
//   EAS_OWNER               Expo account/org that owns the EAS project (optional)
//   APP_BRAND_COLOR         hex; adaptive-icon background, notification accent, splash background
//   APP_SPLASH_BG           hex; splash background if it should differ from APP_BRAND_COLOR
//   APP_ICON                path to a 1024x1024 icon PNG (relative to apps/mobile)
//   APP_ADAPTIVE_ICON       path to an Android adaptive-icon foreground PNG (defaults to APP_ICON)
//   APP_SPLASH_IMAGE        path to the splash logo PNG
//   GOOGLE_SERVICES_JSON    path to google-services.json (EAS file env var); required for Android push
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Plain shape instead of ExpoConfig['plugins'][number]: inferring through that union blows up tsc.
type PluginEntry = string | [string] | [string, Record<string, unknown>];

const ENV = process.env as Record<string, string | undefined>;
const env = (k: string): string | undefined => ENV[k]?.trim() || undefined;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
function color(k: string): string | undefined {
  const v = env(k);
  if (v && !HEX.test(v)) throw new Error(`${k} must be a hex colour like #F59E0B (got "${v}")`);
  return v;
}

/** Replace the options object of a `[name, options]` plugin entry (merging over the defaults). */
function withPluginOptions(plugins: PluginEntry[], name: string, patch: Record<string, unknown>): PluginEntry[] {
  return plugins.map((p) => {
    const id = Array.isArray(p) ? p[0] : p;
    if (id !== name) return p;
    const prev = Array.isArray(p) && p[1] && typeof p[1] === 'object' ? (p[1] as Record<string, unknown>) : {};
    return [name, { ...prev, ...patch }];
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const name = env('EXPO_PUBLIC_APP_NAME') || config.name || 'Steerly';
  const slug = env('APP_SLUG') || config.slug || 'steerly';
  const bundleId = env('APP_BUNDLE_ID');
  const projectId = env('EAS_PROJECT_ID') || config.extra?.eas?.projectId || undefined;
  const brand = color('APP_BRAND_COLOR');
  const splashBg = color('APP_SPLASH_BG') || brand;
  const icon = env('APP_ICON');
  const adaptiveFg = env('APP_ADAPTIVE_ICON') || icon;
  const splashImage = env('APP_SPLASH_IMAGE');
  const scheme = env('APP_SCHEME') || (env('APP_SLUG') ? slug.replace(/[^a-z0-9]/gi, '').toLowerCase() : config.scheme);

  let plugins = (config.plugins ?? []) as unknown as PluginEntry[];
  if (splashBg || splashImage) {
    plugins = withPluginOptions(plugins, 'expo-splash-screen', {
      ...(splashImage ? { image: splashImage } : {}),
      ...(splashBg ? { backgroundColor: splashBg } : {}),
      dark: { image: splashImage ?? './assets/splash-icon.png', backgroundColor: '#0B0B10' },
    });
  }
  if (brand) plugins = withPluginOptions(plugins, 'expo-notifications', { color: brand });

  const baseAdaptive = config.android?.adaptiveIcon ?? {};
  // A custom icon without a matching background/monochrome layer: use it alone on a brand-coloured background.
  const adaptiveIcon = adaptiveFg
    ? { foregroundImage: adaptiveFg, backgroundColor: brand ?? baseAdaptive.backgroundColor ?? '#0F172A' }
    : { ...baseAdaptive, ...(brand ? { backgroundColor: brand } : {}) };

  return {
    ...config,
    name,
    slug,
    scheme,
    ...(env('EAS_OWNER') ? { owner: env('EAS_OWNER') } : {}),
    ...(icon ? { icon } : {}),
    ios: { ...config.ios, ...(bundleId ? { bundleIdentifier: bundleId } : {}) },
    android: {
      ...config.android,
      adaptiveIcon,
      ...(bundleId ? { package: bundleId } : {}),
      ...(env('GOOGLE_SERVICES_JSON') ? { googleServicesFile: env('GOOGLE_SERVICES_JSON') } : {}),
    },
    web: { ...config.web, name, ...(brand ? { themeColor: brand } : {}) },
    plugins: plugins as ExpoConfig['plugins'],
    extra: {
      ...config.extra,
      appName: name,
      defaultSchoolId: env('EXPO_PUBLIC_SCHOOL_ID') || config.extra?.defaultSchoolId || '',
      brandColor: brand ?? null,
      eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) },
    },
  };
};
