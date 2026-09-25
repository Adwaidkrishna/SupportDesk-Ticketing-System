import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_STUN_SERVERS,
  buildIceServers,
  getWebRTCConfig,
} from '../services/webrtcConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- L-03: WEBRTC TURN SERVER CONFIGURATION TEST ---');
  console.log('======================================================\n');

  // =========================================================================
  // Section 1: Baseline STUN Configuration Preservation
  // =========================================================================
  console.log('--- 1. Baseline STUN Server Configuration Preservation ---');
  {
    assert(Array.isArray(DEFAULT_STUN_SERVERS), 'DEFAULT_STUN_SERVERS is an array');
    assert(DEFAULT_STUN_SERVERS.length >= 1, 'Contains baseline STUN entry');
    assert(
      DEFAULT_STUN_SERVERS[0].urls &&
        DEFAULT_STUN_SERVERS[0].urls.some((u) => u.startsWith('stun:')),
      'Baseline STUN URLs start with "stun:" (e.g. Google STUN)'
    );

    const directIce = buildIceServers({});
    assert(Array.isArray(directIce) && directIce.length === 1, 'buildIceServers returns array with default STUN');

    const configNoTurn = getWebRTCConfig(null, { TURN_URL: '' });
    assert(Array.isArray(configNoTurn.iceServers), 'getWebRTCConfig().iceServers is an array');
    assert(configNoTurn.iceServers.length === 1, 'Only STUN server is present when TURN is unconfigured');
    assert(
      configNoTurn.iceServers[0].urls[0].includes('stun.l.google.com'),
      'STUN server is preserved as primary ICE server'
    );
  }

  // =========================================================================
  // Section 2: TURN Absent Behavior (Graceful Fallback)
  // =========================================================================
  console.log('\n--- 2. Unconfigured / Missing TURN Behavior ---');
  {
    // 2.1 Empty environment
    const emptyConfig = getWebRTCConfig(null, {});
    assert(emptyConfig.iceServers.length === 1, 'Does not generate TURN entry when env is empty');
    assert(emptyConfig.iceServers[0].username === undefined, 'No undefined username attribute generated');
    assert(emptyConfig.iceServers[0].credential === undefined, 'No undefined credential attribute generated');

    // 2.2 Blank/whitespace environment
    const blankConfig = getWebRTCConfig(null, {
      TURN_URL: '   ',
      TURN_USERNAME: '   ',
      TURN_PASSWORD: '   ',
    });
    assert(blankConfig.iceServers.length === 1, 'Whitespace-only TURN config is safely ignored');

    // 2.3 Application stability
    assert(typeof emptyConfig === 'object' && emptyConfig !== null, 'Config returns valid object without crashing');
    assert(emptyConfig.iceCandidatePoolSize === 10, 'Standard iceCandidatePoolSize is preserved');
    assert(emptyConfig.bundlePolicy === 'max-bundle', 'Standard bundlePolicy is preserved');
  }

  // =========================================================================
  // Section 3: Single TURN URL & Credential Mapping
  // =========================================================================
  console.log('\n--- 3. Single TURN Server & Credential Mapping ---');
  {
    const mockEnv = {
      TURN_URL: 'turn:turn.example.test:3478?transport=udp',
      TURN_USERNAME: 'test-support-user',
      TURN_PASSWORD: 'test-turn-secret-password',
    };

    const config = getWebRTCConfig(null, mockEnv);
    assert(config.iceServers.length === 2, 'iceServers contains both STUN (0) and TURN (1)');
    assert(config.iceServers[0].urls[0].startsWith('stun:'), 'Index 0 is STUN server');

    const turnEntry = config.iceServers[1];
    assert(
      turnEntry.urls === 'turn:turn.example.test:3478?transport=udp',
      'TURN URL is correctly mapped to urls field'
    );
    assert(turnEntry.username === 'test-support-user', 'TURN username is mapped to "username"');
    assert(
      turnEntry.credential === 'test-turn-secret-password',
      'TURN password is mapped to standard WebRTC "credential" attribute'
    );
  }

  // =========================================================================
  // Section 4: Secure TURNS (TLS) Protocol Support
  // =========================================================================
  console.log('\n--- 4. Secure TURNS (TLS) Protocol Support ---');
  {
    const turnsEnv = {
      TURN_URL: 'turns:turn.secure.example.test:5349?transport=tcp',
      TURN_USERNAME: 'secure-user',
      TURN_PASSWORD: 'secure-password',
    };

    const config = getWebRTCConfig(null, turnsEnv);
    const turnEntry = config.iceServers[1];
    assert(
      typeof turnEntry.urls === 'string' && turnEntry.urls.startsWith('turns:'),
      'Secure turns: protocol is fully supported and preserved'
    );
    assert(turnEntry.urls.includes(':5349'), 'Secure port (5349) preserved in turns: URL');
  }

  // =========================================================================
  // Section 5: Multiple TURN URLs Support (Comma-Separated & JSON)
  // =========================================================================
  console.log('\n--- 5. Multiple TURN URLs Handling ---');
  {
    // 5.1 Comma-separated list with mixed turn: and turns:
    const multiEnv = {
      TURN_URL: 'turn:turn1.example.test:3478?transport=udp, turns:turn2.example.test:5349?transport=tcp',
      TURN_USERNAME: 'cluster-user',
      TURN_PASSWORD: 'cluster-password',
    };

    const multiConfig = getWebRTCConfig(null, multiEnv);
    const turnEntry = multiConfig.iceServers[1];
    assert(Array.isArray(turnEntry.urls), 'Multiple URLs parsed into array of URLs');
    assert(turnEntry.urls.length === 2, 'Both TURN URLs included in urls array');
    assert(turnEntry.urls[0] === 'turn:turn1.example.test:3478?transport=udp', 'First UDP TURN URL present');
    assert(turnEntry.urls[1] === 'turns:turn2.example.test:5349?transport=tcp', 'Second TLS TURNS URL present');

    // 5.2 JSON array format
    const jsonEnv = {
      TURN_URL: JSON.stringify([
        'turn:json1.example.test:3478',
        'turns:json2.example.test:5349',
      ]),
      TURN_USERNAME: 'json-user',
      TURN_PASSWORD: 'json-password',
    };

    const jsonConfig = getWebRTCConfig(null, jsonEnv);
    const jsonTurnEntry = jsonConfig.iceServers[1];
    assert(Array.isArray(jsonTurnEntry.urls), 'JSON array format parsed into urls array');
    assert(jsonTurnEntry.urls.length === 2, 'All JSON array entries preserved');
    assert(jsonTurnEntry.urls[0] === 'turn:json1.example.test:3478', 'First JSON URL matches');
  }

  // =========================================================================
  // Section 6: Vite VITE_ Prefix & Alternative Key Name Compatibility
  // =========================================================================
  console.log('\n--- 6. Vite VITE_ Prefix & Key Variant Compatibility ---');
  {
    const viteEnv = {
      VITE_TURN_URL: 'turn:vite.example.test:3478',
      VITE_TURN_USERNAME: 'vite-user',
      VITE_TURN_CREDENTIAL: 'vite-credential',
    };

    const viteConfig = getWebRTCConfig(null, viteEnv);
    const turnEntry = viteConfig.iceServers[1];
    assert(turnEntry.urls === 'turn:vite.example.test:3478', 'VITE_TURN_URL correctly recognized');
    assert(turnEntry.username === 'vite-user', 'VITE_TURN_USERNAME correctly recognized');
    assert(turnEntry.credential === 'vite-credential', 'VITE_TURN_CREDENTIAL correctly recognized');
  }

  // =========================================================================
  // Section 7: Centralized WebRTC Hook Integration (useWebRTC)
  // =========================================================================
  console.log('\n--- 7. Centralized WebRTC Hook Integration Verification ---');
  {
    const hookPath = path.resolve(__dirname, '../features/video-call/hooks/useWebRTC.js');
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    assert(
      hookContent.includes('getWebRTCConfig'),
      'useWebRTC imports and uses getWebRTCConfig'
    );
    assert(
      hookContent.includes('new RTCPeerConnection(config)'),
      'RTCPeerConnection instantiated with getWebRTCConfig output'
    );

    // Verify all modalities share this single RTCPeerConnection:
    assert(
      hookContent.includes('syncLocalTracks(pc, localStream)'),
      'Audio & Video tracks both synchronized onto the single RTCPeerConnection'
    );
    assert(
      hookContent.includes('startScreenShare') && hookContent.includes('replaceTrack'),
      'Screen sharing reuses the active RTCPeerConnection via replaceTrack'
    );
  }

  // =========================================================================
  // Section 8: Security Verification: No Hard-Coded Credentials
  // =========================================================================
  console.log('\n--- 8. Security Audit: No Hard-Coded Real Credentials ---');
  {
    const configPath = path.resolve(__dirname, '../services/webrtcConfig.js');
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Verify no hard-coded turn credentials exist in webrtcConfig.js
    assert(
      !configContent.includes('password:') && !configContent.includes('secret'),
      'No hard-coded credentials or passwords in webrtcConfig.js'
    );
    assert(
      !configContent.includes('console.log') && !configContent.includes('console.info'),
      'No credential logging in webrtcConfig.js'
    );

    // Verify .env.example contains only placeholders
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    if (fs.existsSync(envExamplePath)) {
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      assert(
        envExampleContent.includes('VITE_TURN_URL=') &&
          !envExampleContent.includes('VITE_TURN_PASSWORD=secret'),
        'FRONTEND/.env.example contains only blank placeholders for TURN'
      );
    }
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
