export const PRODUCTION_SITE_URL = 'https://www.eventecos.com';

const LOCAL_HOST =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i;

/**
 * The address texts and emails should link to. A hosted server (Render sets RENDER=true) must never
 * link to a developer machine, so a missing or localhost FRONTEND_URL there falls back to the real site.
 */
export function resolveFrontendUrl(env: NodeJS.ProcessEnv): string | undefined {
  const configured = env.FRONTEND_URL?.trim();
  const hosted = env.RENDER === 'true' || env.NODE_ENV === 'production';
  if (hosted && (!configured || LOCAL_HOST.test(configured))) {
    return PRODUCTION_SITE_URL;
  }
  return configured ? configured.replace(/\/+$/, '') : undefined;
}

/** Applies resolveFrontendUrl to process.env once at startup; returns the value if it was changed. */
export function applyFrontendUrl(env: NodeJS.ProcessEnv): string | null {
  const resolved = resolveFrontendUrl(env);
  if (resolved && resolved !== env.FRONTEND_URL) {
    env.FRONTEND_URL = resolved;
    return resolved;
  }
  return null;
}
