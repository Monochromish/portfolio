import { createError, defineEventHandler, getQuery, sendRedirect, useSession } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  event.res.headers.set('cache-control', 'no-store')
  const ownerId = requireOwnerGithubId(event)
  const { code, state, error } = getQuery<{ code?: unknown, state?: unknown, error?: unknown }>(event)
  const attempt = await useSession<OAuthAttempt>(event, await oauthSessionConfig(event))
  const { state: expectedState, verifier } = attempt.data
  await attempt.clear()
  if (error) throw createError({ status: 400, statusText: 'GitHub sign-in was not completed' })
  if (typeof code !== 'string' || typeof state !== 'string' || !expectedState || !verifier || !sameText(state, expectedState)) {
    throw createError({ status: 400, statusText: 'Sign-in state did not match, start again at /auth/github' })
  }
  const user = await fetchGithubUser(await exchangeGithubCode(event, code, verifier))
  if (String(user.id) !== ownerId) throw createError({ status: 403, statusText: 'This GitHub account is not the site owner' })
  const owner = await useSession<OwnerSession>(event, await ownerSessionConfig(event))
  await owner.clear()
  await owner.update({ githubId: user.id, login: user.login })
  return sendRedirect(event, '/admin', 302)
})
