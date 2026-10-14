import { useCallback, useEffect, useState } from 'react'
import { browser } from '#imports'

export interface PlatformPermission {
  readonly granted: boolean | undefined
  readonly request: () => void
  readonly revoke: () => void
}

/**
 * Tracks and changes the optional host permission for one platform (plan §1.7). Requests
 * must come from a click, so this runs in an extension page, not the service worker.
 *
 * @param origins - The platform's match patterns.
 * @returns Whether access is granted, plus request and revoke actions.
 */
export function usePlatformPermission(origins: readonly string[]): PlatformPermission {
  const [granted, setGranted] = useState<boolean | undefined>(undefined)

  const refresh = useCallback(() => {
    browser.permissions
      .contains({ origins: [...origins] })
      .then(setGranted)
      .catch((error: unknown) => {
        console.error('Skimmy: could not read permissions', error)
      })
  }, [origins])

  useEffect(() => {
    refresh()
    browser.permissions.onAdded.addListener(refresh)
    browser.permissions.onRemoved.addListener(refresh)
    return () => {
      browser.permissions.onAdded.removeListener(refresh)
      browser.permissions.onRemoved.removeListener(refresh)
    }
  }, [refresh])

  const request = useCallback(() => {
    browser.permissions.request({ origins: [...origins] }).then(refresh, refresh)
  }, [origins, refresh])

  const revoke = useCallback(() => {
    browser.permissions.remove({ origins: [...origins] }).then(refresh, refresh)
  }, [origins, refresh])

  return { granted, request, revoke }
}
