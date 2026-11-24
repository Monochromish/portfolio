const ALIAS_HOSTS = new Set([
  'monochromish.com',
  'www.monochromish.com',
  'monochromi.sh',
  'www.monochromi.sh',
  'himanshuadwani.com',
  'www.himanshuadwani.com',
  // previews the alias in development
  'monochromish.localhost',
])

export function isAliasHost(hostname: string) {
  return ALIAS_HOSTS.has(hostname.toLowerCase())
}
