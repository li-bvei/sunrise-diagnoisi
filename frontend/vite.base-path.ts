/**
 * Where the built app is served from ("/" or a sub-path such as "/server/").
 *
 * The live site is https://www.sunrise-nskt.com/server/, so an UNSET variable must keep
 * building for "/server/" in production — otherwise the next deploy would silently switch
 * the bundle to "/assets/..." and white-screen the live site. Setting VITE_BASE_PATH
 * (root `.env` next to docker-compose.yml, or a shell variable) overrides it, e.g. "/" for a
 * dedicated (sub)domain. Development stays on "/".
 */
export const DEFAULT_PRODUCTION_BASE = '/server/'

export function resolveBasePath(raw: string | undefined, isProduction: boolean): string {
  const fallback = isProduction ? DEFAULT_PRODUCTION_BASE : '/'
  const value = (raw ?? '').trim()
  if (!value) return fallback

  // Fail the build loudly on a bad value: a wrong base does not error, it just white-screens.
  if (!value.startsWith('/') || value.startsWith('//') || /[^A-Za-z0-9._~/-]/.test(value) || /(^|\/)\.\.?(\/|$)/.test(value)) {
    throw new Error(`VITE_BASE_PATH must be an absolute path such as "/" or "/server/" (got "${value}")`)
  }
  const segments = value.split('/').filter(Boolean)
  return segments.length ? `/${segments.join('/')}/` : '/'
}
