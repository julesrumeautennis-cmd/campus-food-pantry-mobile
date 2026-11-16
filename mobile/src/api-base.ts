// Web previews use their own origin; native apps need a reachable absolute API URL.
export function resolveApiBase(configured: string | undefined, platform: string): string | undefined {
  const base = configured?.trim().replace(/\/+$/, '');
  if (!base) return platform === 'web' ? '' : undefined;
  try {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    return base;
  } catch {
    return undefined;
  }
}
