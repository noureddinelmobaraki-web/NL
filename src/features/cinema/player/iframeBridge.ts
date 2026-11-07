/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export {
  resetNlBridgeSeq,
  isSyncCapableEvent,
  parsePlayerMessage,
  sendIframePlayerCommand,
  type BridgeKind,
  type BridgeTier,
  type BridgeDiscoveredSubtitle,
  type BridgeDiscoveredStream,
  type BridgeEvent,
  type IframePlayerCommand,
} from "./messageProtocol";

export { isOriginAllowed, isFromFrame } from "./originAllowlist";
export { useIframePlayerBridge } from "./bridge";
