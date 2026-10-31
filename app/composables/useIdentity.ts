import { isAliasHost } from '#shared/hosts'

export function useIdentity() {
  const alias = isAliasHost(useRequestURL().hostname)
  return { alias, name: alias ? 'Monochromish' : 'Himanshu Adwani' }
}
