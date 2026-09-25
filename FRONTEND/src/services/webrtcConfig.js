/**
 * WebRTC Configuration Module (L-03)
 *
 * Configurable ICE server configuration for RTCPeerConnection initialization.
 * Starts with public Google STUN servers for standard NAT discovery,
 * and dynamically incorporates TURN/TURNS relay servers from environment variables
 * to guarantee peer connectivity across restrictive corporate firewalls and symmetric NATs.
 */

export const DEFAULT_STUN_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];

/**
 * Safely retrieves an environment variable from either Vite's import.meta.env
 * or Node's process.env (for tests/SSR), checking standard and VITE_-prefixed variants.
 *
 * @param {string} name - Variable name without prefix
 * @returns {string|undefined}
 */
const getEnvVar = (name) => {
  // 1. Check Vite browser client environment
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      if (import.meta.env[`VITE_${name}`] !== undefined) return import.meta.env[`VITE_${name}`];
      if (import.meta.env[name] !== undefined) return import.meta.env[name];
    }
  } catch {
    // import.meta may not be accessible in some environments
  }

  // 2. Check Node.js / test environment
  if (typeof process !== 'undefined' && process && process.env) {
    if (process.env[`VITE_${name}`] !== undefined) return process.env[`VITE_${name}`];
    if (process.env[name] !== undefined) return process.env[name];
  }

  return undefined;
};

/**
 * Builds the complete list of ICE servers.
 * Always includes baseline STUN servers, and conditionally appends TURN servers
 * if valid TURN configuration is present in environment variables.
 *
 * @param {Object} [envOverrides] - Optional explicit environment overrides (for testing/mocking)
 * @returns {Array<{ urls: string|string[], username?: string, credential?: string }>}
 */
export const buildIceServers = (envOverrides = null) => {
  const getVal = (name) => {
    if (envOverrides && typeof envOverrides === 'object') {
      if (envOverrides[`VITE_${name}`] !== undefined) return envOverrides[`VITE_${name}`];
      if (envOverrides[name] !== undefined) return envOverrides[name];
    }
    return getEnvVar(name);
  };

  const iceServers = [...DEFAULT_STUN_SERVERS];

  const rawTurnUrl = getVal('TURN_URL') || getVal('TURN_SERVER_URL');
  const turnUsername = getVal('TURN_USERNAME');
  const turnPassword = getVal('TURN_PASSWORD') || getVal('TURN_CREDENTIAL');

  if (rawTurnUrl && typeof rawTurnUrl === 'string' && rawTurnUrl.trim().length > 0) {
    const trimmed = rawTurnUrl.trim();
    let urls = [];

    // Support JSON array format (e.g. '["turn:a.com", "turns:b.com"]')
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          urls = parsed.map((u) => String(u).trim()).filter(Boolean);
        }
      } catch {
        urls = [];
      }
    }

    // Support comma-separated format (e.g. 'turn:turn.example.com:3478,turns:turn.example.com:5349')
    if (urls.length === 0) {
      urls = trimmed
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
    }

    if (urls.length > 0) {
      const turnEntry = {
        urls: urls.length === 1 ? urls[0] : urls,
      };

      if (turnUsername && typeof turnUsername === 'string' && turnUsername.trim().length > 0) {
        turnEntry.username = turnUsername.trim();
      }

      if (turnPassword && typeof turnPassword === 'string' && turnPassword.trim().length > 0) {
        turnEntry.credential = turnPassword.trim();
      }

      iceServers.push(turnEntry);
    }
  }

  return iceServers;
};

// Export DEFAULT_ICE_SERVERS as the dynamically evaluated default
export const DEFAULT_ICE_SERVERS = buildIceServers();

/**
 * Generates the RTCConfiguration object passed to `new RTCPeerConnection(config)`
 *
 * @param {Array<Object>} [customIceServers] - Optional custom or dynamic ICE servers
 * @param {Object} [envOverrides] - Optional environment overrides (used for testing)
 * @returns {RTCConfiguration}
 */
export const getWebRTCConfig = (customIceServers = null, envOverrides = null) => {
  const iceServers = Array.isArray(customIceServers) && customIceServers.length > 0
    ? customIceServers
    : buildIceServers(envOverrides);

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
};

export default getWebRTCConfig;
