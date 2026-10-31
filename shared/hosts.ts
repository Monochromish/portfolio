const ALIAS_HOSTS = new Set([
  'monochromish.com',
  'www.monochromish.com',
  'monochromi.sh',
  'www.monochromi.sh',
  // previews the alias in development
  'monochromish.localhost',
])

export function isAliasHost(hostname: string) {
  return ALIAS_HOSTS.has(hostname.toLowerCase())
}
