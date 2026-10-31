import { defineEventHandler, sendRedirect, useSession } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  event.res.headers.set('cache-control', 'no-store')
  requireOwnerGithubId(event)
  const { clientId } = githubOAuthConfig(event)
  const state = randomToken()
  const verifier = randomToken()
  const challenge = toBase64Url(await crypto.subtle.digest('SHA-256', utf8(verifier)))
  const attempt = await useSession<OAuthAttempt>(event, await oauthSessionConfig(event))
  await attempt.update({ state, verifier })
  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubCallbackUrl(event),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    allow_signup: 'false',
  }).toString()
  return sendRedirect(event, authorize.href, 302)
})
