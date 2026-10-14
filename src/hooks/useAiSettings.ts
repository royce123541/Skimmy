import { useCallback, useEffect, useState } from 'react'
import { aiSettingsItem, readAiSettings, type AiSettings } from '@/lib/storage/aiSettings'
import type { CloudProviderId } from '@/types/ai.types'

export interface AiSettingsControls {
  readonly settings: AiSettings | null
  readonly setProvider: (provider: CloudProviderId) => void
  readonly setModel: (provider: CloudProviderId, model: string) => void
}

function save(next: AiSettings): void {
  aiSettingsItem.setValue(next).catch((error: unknown) => {
    console.error('Skimmy: could not save AI settings', error)
  })
}

/**
 * The user's default provider and per-provider models, kept in sync with storage.
 *
 * @returns Current settings (null while loading) and setters.
 */
export function useAiSettings(): AiSettingsControls {
  const [settings, setSettings] = useState<AiSettings | null>(null)

  useEffect(() => {
    const refresh = (): void => {
      readAiSettings()
        .then(setSettings)
        .catch((error: unknown) => {
          console.error('Skimmy: could not read AI settings', error)
        })
    }
    refresh()
    return aiSettingsItem.watch(refresh)
  }, [])

  const setProvider = useCallback(
    (provider: CloudProviderId) => {
      if (settings !== null) {
        save({ ...settings, provider })
      }
    },
    [settings],
  )

  const setModel = useCallback(
    (provider: CloudProviderId, model: string) => {
      if (settings !== null) {
        save({ ...settings, models: { ...settings.models, [provider]: model } })
      }
    },
    [settings],
  )

  return { settings, setProvider, setModel }
}
