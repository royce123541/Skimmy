import { defineContentScript } from '#imports'
import { startCapture } from '@/lib/adapters/core/captureEngine'
import { listenForCatchUp } from '@/lib/adapters/core/catchUpListener'
import { createContextHost } from '@/lib/adapters/core/contextHost'
import { parseSelectorPack } from '@/lib/adapters/core/selectorPack'
import { MESSENGER_MATCHES } from '@/lib/adapters/messenger/matches'
import { createMessengerAdapter } from '@/lib/adapters/messenger/messengerAdapter'
import messengerPack from '@/lib/adapters/messenger/selectors.json'

export default defineContentScript({
  matches: MESSENGER_MATCHES,
  // Registered by the service worker only after the user grants facebook.com (ADR 0002).
  registration: 'runtime',
  main(ctx) {
    const adapter = createMessengerAdapter(document, parseSelectorPack(messengerPack))
    const session = startCapture(createContextHost(ctx), adapter)
    listenForCatchUp(ctx, adapter, session)
  },
})
