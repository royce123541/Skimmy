import { defineExtensionMessaging } from '@webext-core/messaging'
import type {
  ConversationChangedPayload,
  DeleteApiKeyPayload,
  IngestBatchPayload,
  CatchUpOutcome,
  RequestSkimPayload,
  SaveApiKeyPayload,
  StartCatchUpPayload,
} from '@/types/messaging.types'
import type { RpcResult } from '@/types/rpc.types'

/**
 * Every message the extension contexts exchange (plan §1.4). Catch-up messages go to a tab's
 * content script; everything else is handled by the service worker.
 */
export interface ProtocolMap {
  ingestBatch(data: IngestBatchPayload): RpcResult<{ added: number }>
  conversationChanged(data: ConversationChangedPayload): RpcResult<null>
  requestSkim(data: RequestSkimPayload): RpcResult<{ skimId: string }>
  saveApiKey(data: SaveApiKeyPayload): RpcResult<null>
  deleteApiKey(data: DeleteApiKeyPayload): RpcResult<null>
  startCatchUp(data: StartCatchUpPayload): RpcResult<CatchUpOutcome>
  cancelCatchUp(): RpcResult<null>
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>()
