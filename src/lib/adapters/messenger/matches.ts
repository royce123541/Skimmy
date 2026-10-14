/**
 * Where the Messenger adapter runs (ADR 0006). facebook.com is a single-page app, so the
 * script matches the whole origin and stays idle outside /messages. messenger.com is kept
 * while it still serves the app.
 */
export const MESSENGER_MATCHES = [
  'https://www.facebook.com/*',
  'https://web.facebook.com/*',
  'https://www.messenger.com/*',
]
