/**
 * WebRTC Configuration Module
 *
 * Configurable ICE server configuration for PeerConnection initialization.
 * Starts with public Google STUN servers for development/NAT discovery,
 * with structured placeholders for TURN relay servers (e.g. coturn, Twilio, Xirsys)
 * needed in restricted corporate network environments.
 */

export const DEFAULT_ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
  // Future TURN servers can be injected dynamically via environment or auth tokens:
  // ...(import.meta.env.VITE_TURN_SERVER_URL ? [{
  //   urls: import.meta.env.VITE_TURN_SERVER_URL,
  //   username: import.meta.env.VITE_TURN_USERNAME,
  //   credential: import.meta.env.VITE_TURN_CREDENTIAL,
  // }] : []),
];

/**
 * Generates the RTCConfiguration object passed to `new RTCPeerConnection(config)`
 *
 * @param {Array<Object>} [customIceServers] - Optional custom or dynamic ICE servers
 * @returns {RTCConfiguration}
 */
export const getWebRTCConfig = (customIceServers = null) => {
  return {
    iceServers: Array.isArray(customIceServers) && customIceServers.length > 0
      ? customIceServers
      : DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
};

export default getWebRTCConfig;
