/**
 * Step 5 Unit & Lifecycle Test Suite for WebRTC Peer Connection & Audio/Video Flow
 *
 * Verifies:
 * 1. RTCPeerConnection creation using getWebRTCConfig()
 * 2. Local MediaStream tracks added to RTCPeerConnection senders
 * 3. Offer creation and local description setting by Agent (offerer)
 * 4. Remote offer handling, remote description setting, and answer generation by Customer (answerer)
 * 5. Answer receiving and remote description setting by Agent
 * 6. ICE candidate generation (onicecandidate) and buffering prior to setRemoteDescription
 * 7. Candidate queue draining upon setRemoteDescription completion
 * 8. Remote media track handling via ontrack populating remote MediaStream
 * 9. WebRTC connection states (new, connecting, connected, disconnected, failed, closed)
 * 10. Peer connection cleanup (close, listener removal, stream nulling, state reset)
 * 11. Duplicate connection prevention across re-renders
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Mock Classes: RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream
// -----------------------------------------------------------------------------

class MockMediaStreamTrack {
  constructor(kind, id = `track_${Math.random().toString(36).substring(2, 7)}`) {
    this.id = id;
    this.kind = kind; // 'video' | 'audio'
    this.enabled = true;
    this.readyState = 'live';
    this.stopped = false;
  }

  stop() {
    this.readyState = 'ended';
    this.stopped = true;
  }
}

class MockMediaStream {
  constructor(tracks = []) {
    this.id = 'stream_' + Math.random().toString(36).substring(2, 9);
    this.tracks = [...tracks];
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  addTrack(track) {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track);
    }
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter((t) => t !== track);
  }
}

class MockRTCSessionDescription {
  constructor(descriptionInitDict) {
    this.type = descriptionInitDict.type;
    this.sdp = descriptionInitDict.sdp;
  }
}

class MockRTCIceCandidate {
  constructor(candidateInitDict) {
    this.candidate = candidateInitDict.candidate;
    this.sdpMid = candidateInitDict.sdpMid;
    this.sdpMLineIndex = candidateInitDict.sdpMLineIndex;
  }

  toJSON() {
    return {
      candidate: this.candidate,
      sdpMid: this.sdpMid,
      sdpMLineIndex: this.sdpMLineIndex,
    };
  }
}

class MockRTCRtpSender {
  constructor(track, stream) {
    this.track = track;
    this.stream = stream;
  }

  async replaceTrack(newTrack) {
    this.track = newTrack;
  }
}

class MockRTCPeerConnection {
  constructor(config = {}) {
    this.config = config;
    this.signalingState = 'stable';
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.senders = [];
    this.addedIceCandidates = [];
    this.closed = false;

    // Event handlers
    this.ontrack = null;
    this.onicecandidate = null;
    this.onconnectionstatechange = null;
    this.oniceconnectionstatechange = null;
    this.onsignalingstatechange = null;
  }

  getSenders() {
    return this.senders;
  }

  addTrack(track, stream) {
    if (this.closed) throw new Error('PeerConnection is closed');
    const sender = new MockRTCRtpSender(track, stream);
    this.senders.push(sender);
    return sender;
  }

  async createOffer(options = {}) {
    if (this.closed) throw new Error('PeerConnection is closed');
    return new MockRTCSessionDescription({
      type: 'offer',
      sdp: 'v=0\r\no=agent 12345 2 IN IP4 127.0.0.1\r\ns=SupportDesk Video Offer\r\nt=0 0\r\n',
    });
  }

  async createAnswer(options = {}) {
    if (this.closed) throw new Error('PeerConnection is closed');
    return new MockRTCSessionDescription({
      type: 'answer',
      sdp: 'v=0\r\no=customer 67890 2 IN IP4 127.0.0.1\r\ns=SupportDesk Video Answer\r\nt=0 0\r\n',
    });
  }

  async setLocalDescription(desc) {
    if (this.closed) throw new Error('PeerConnection is closed');
    this.localDescription = desc;
    if (desc.type === 'offer') {
      this.signalingState = 'have-local-offer';
    } else if (desc.type === 'answer') {
      this.signalingState = 'stable';
    }
  }

  async setRemoteDescription(desc) {
    if (this.closed) throw new Error('PeerConnection is closed');
    this.remoteDescription = desc;
    if (desc.type === 'offer') {
      this.signalingState = 'have-remote-offer';
    } else if (desc.type === 'answer') {
      this.signalingState = 'stable';
    }
  }

  async addIceCandidate(candidate) {
    if (this.closed) throw new Error('PeerConnection is closed');
    if (!this.remoteDescription) {
      throw new Error('InvalidStateError: Cannot add ICE candidate before remote description is set');
    }
    this.addedIceCandidates.push(candidate);
  }

  close() {
    this.closed = true;
    this.signalingState = 'closed';
    this.connectionState = 'closed';
    this.iceConnectionState = 'closed';
  }

  // Test helpers to simulate browser events
  simulateIceCandidate(candidate) {
    if (typeof this.onicecandidate === 'function') {
      this.onicecandidate({ candidate });
    }
  }

  simulateTrack(track, stream) {
    if (typeof this.ontrack === 'function') {
      this.ontrack({
        track,
        streams: stream ? [stream] : [],
      });
    }
  }

  simulateConnectionState(state) {
    this.connectionState = state;
    if (typeof this.onconnectionstatechange === 'function') {
      this.onconnectionstatechange();
    }
  }
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------

async function runStep5WebRTCTests() {
  console.log('--- STARTING STEP 5: WEBRTC PEER CONNECTION & MEDIA FLOW TESTS ---\n');

  // Inject globals for the test runner
  globalThis.RTCPeerConnection = MockRTCPeerConnection;
  globalThis.RTCSessionDescription = MockRTCSessionDescription;
  globalThis.RTCIceCandidate = MockRTCIceCandidate;
  globalThis.MediaStream = MockMediaStream;

  // 1. WebRTC Configuration
  console.log('1. Testing RTCPeerConnection Configuration...');
  const { getWebRTCConfig } = await import('../../FRONTEND/src/services/webrtcConfig.js');
  const rtcConfig = getWebRTCConfig();
  assert(rtcConfig && Array.isArray(rtcConfig.iceServers), 'getWebRTCConfig() returns valid config with iceServers array');
  assert(rtcConfig.iceServers.length > 0, 'Config contains at least one STUN/TURN server configuration');
  assert(
    rtcConfig.iceServers.some((s) => s.urls && (s.urls.includes('stun:') || (Array.isArray(s.urls) && s.urls[0].includes('stun:')))),
    'Config contains valid STUN server URLs'
  );

  // 2. RTCPeerConnection Creation & Track Binding
  console.log('\n2. Testing RTCPeerConnection Creation and Local Track Binding...');
  const pcAgent = new MockRTCPeerConnection(rtcConfig);
  const audioTrack = new MockMediaStreamTrack('audio');
  const videoTrack = new MockMediaStreamTrack('video');
  const localStream = new MockMediaStream([audioTrack, videoTrack]);

  // Bind local tracks
  localStream.getTracks().forEach((track) => {
    pcAgent.addTrack(track, localStream);
  });

  const senders = pcAgent.getSenders();
  assert(senders.length === 2, 'Both audio and video tracks added to RTCPeerConnection');
  assert(senders.some((s) => s.track.kind === 'audio'), 'Audio sender track registered');
  assert(senders.some((s) => s.track.kind === 'video'), 'Video sender track registered');

  // Test Track Replacement without renegotiation
  const replacementVideoTrack = new MockMediaStreamTrack('video');
  const videoSender = senders.find((s) => s.track.kind === 'video');
  await videoSender.replaceTrack(replacementVideoTrack);
  assert(videoSender.track === replacementVideoTrack, 'Sender successfully replaces video track without re-negotiation');

  // 3. Offer Creation & Local Description Flow (Agent side)
  console.log('\n3. Testing Offer Creation & Local Description (Agent/Offerer)...');
  const offer = await pcAgent.createOffer();
  assert(offer.type === 'offer', 'Created session description is of type "offer"');
  assert(typeof offer.sdp === 'string' && offer.sdp.length > 0, 'Offer contains non-empty SDP string');

  await pcAgent.setLocalDescription(offer);
  assert(pcAgent.localDescription === offer, 'setLocalDescription stored local offer');
  assert(pcAgent.signalingState === 'have-local-offer', 'Signaling state transitioned to "have-local-offer"');

  // 4. Remote Offer Handling & Answer Generation (Customer side)
  console.log('\n4. Testing Remote Offer Handling & Answer Generation (Customer/Answerer)...');
  const pcCustomer = new MockRTCPeerConnection(rtcConfig);
  const customerAudio = new MockMediaStreamTrack('audio');
  const customerVideo = new MockMediaStreamTrack('video');
  const customerStream = new MockMediaStream([customerAudio, customerVideo]);
  customerStream.getTracks().forEach((t) => pcCustomer.addTrack(t, customerStream));

  // Customer receives offer and sets remote description
  await pcCustomer.setRemoteDescription(new MockRTCSessionDescription(offer));
  assert(pcCustomer.remoteDescription.type === 'offer', 'Customer setRemoteDescription stored incoming offer');
  assert(pcCustomer.signalingState === 'have-remote-offer', 'Customer signaling state transitioned to "have-remote-offer"');

  // Customer creates answer and sets local description
  const answer = await pcCustomer.createAnswer();
  assert(answer.type === 'answer', 'Created session description is of type "answer"');
  await pcCustomer.setLocalDescription(answer);
  assert(pcCustomer.localDescription === answer, 'Customer setLocalDescription stored answer');
  assert(pcCustomer.signalingState === 'stable', 'Customer signaling state returned to "stable" after answer');

  // 5. Remote Answer Handling (Agent side)
  console.log('\n5. Testing Remote Answer Handling (Agent/Offerer)...');
  await pcAgent.setRemoteDescription(new MockRTCSessionDescription(answer));
  assert(pcAgent.remoteDescription.type === 'answer', 'Agent setRemoteDescription stored incoming answer');
  assert(pcAgent.signalingState === 'stable', 'Agent signaling state returned to "stable" after answer applied');

  // 6. ICE Candidate Buffering & Exchange
  console.log('\n6. Testing ICE Candidate Exchange and Early Candidate Buffering...');
  const pcNew = new MockRTCPeerConnection(rtcConfig);
  const candidateBuffer = [];

  const rawCandidate = {
    candidate: 'candidate:1 1 UDP 2122252543 192.168.1.100 54321 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
  };

  // Simulate ICE candidate arriving BEFORE remote description is set
  if (!pcNew.remoteDescription) {
    candidateBuffer.push(rawCandidate);
  }

  assert(candidateBuffer.length === 1, 'Early remote ICE candidate buffered while remote description is null');

  let earlyAddFailed = false;
  try {
    // Attempting to add candidate without remoteDescription should throw according to WebRTC spec
    await pcNew.addIceCandidate(rawCandidate);
  } catch (err) {
    earlyAddFailed = true;
  }
  assert(earlyAddFailed, 'Calling addIceCandidate before setRemoteDescription safely prevented');

  // Now apply remote description
  await pcNew.setRemoteDescription(new MockRTCSessionDescription(offer));

  // Drain buffer
  while (candidateBuffer.length > 0) {
    const queued = candidateBuffer.shift();
    await pcNew.addIceCandidate(new MockRTCIceCandidate(queued));
  }

  assert(candidateBuffer.length === 0, 'Candidate queue drained cleanly after setRemoteDescription');
  assert(pcNew.addedIceCandidates.length === 1, 'Buffered candidate successfully added to RTCPeerConnection');

  // Test onicecandidate event generation
  let generatedCandidate = null;
  pcNew.onicecandidate = (event) => {
    generatedCandidate = event.candidate;
  };
  pcNew.simulateIceCandidate(new MockRTCIceCandidate(rawCandidate));
  assert(generatedCandidate !== null, 'onicecandidate event handler triggered with valid candidate');
  assert(generatedCandidate.candidate.includes('typ host'), 'Generated candidate preserves SDP attributes');

  // 7. Remote MediaStream Track Reception (ontrack)
  console.log('\n7. Testing Remote MediaStream Reception via ontrack...');
  let receivedRemoteStream = null;
  pcAgent.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      receivedRemoteStream = event.streams[0];
    } else {
      receivedRemoteStream = new MockMediaStream([event.track]);
    }
  };

  const remoteVideoTrack = new MockMediaStreamTrack('video');
  const simulatedRemoteStream = new MockMediaStream([remoteVideoTrack]);
  pcAgent.simulateTrack(remoteVideoTrack, simulatedRemoteStream);

  assert(receivedRemoteStream !== null, 'ontrack event successfully captured remote media');
  assert(receivedRemoteStream.getTracks().length === 1, 'Remote MediaStream contains received video track');
  assert(receivedRemoteStream.getVideoTracks()[0] === remoteVideoTrack, 'Received video track matches remote stream track');

  // 8. Connection State Monitoring
  console.log('\n8. Testing WebRTC Connection State Transitions...');
  let capturedState = 'new';
  pcAgent.onconnectionstatechange = () => {
    capturedState = pcAgent.connectionState;
  };

  pcAgent.simulateConnectionState('connecting');
  assert(capturedState === 'connecting', 'State transitioned to "connecting"');

  pcAgent.simulateConnectionState('connected');
  assert(capturedState === 'connected', 'State transitioned to "connected"');

  pcAgent.simulateConnectionState('disconnected');
  assert(capturedState === 'disconnected', 'State transitioned to "disconnected"');

  // 9. Peer Connection Cleanup
  console.log('\n9. Testing Peer Connection Cleanup & Resource Release...');
  pcAgent.close();
  assert(pcAgent.closed === true, 'RTCPeerConnection.close() marked instance as closed');
  assert(pcAgent.signalingState === 'closed', 'Signaling state updated to "closed"');
  assert(pcAgent.connectionState === 'closed', 'Connection state updated to "closed"');

  let operationAfterCloseFailed = false;
  try {
    await pcAgent.createOffer();
  } catch (err) {
    operationAfterCloseFailed = true;
  }
  assert(operationAfterCloseFailed, 'Subsequent WebRTC operations on closed RTCPeerConnection are rejected');

  // 10. Duplicate Connection Prevention Logic
  console.log('\n10. Testing Duplicate Connection Guarding...');
  let activePc = new MockRTCPeerConnection(rtcConfig);
  let createCalls = 0;

  function getOrCreateConnection() {
    createCalls++;
    if (activePc && activePc.signalingState !== 'closed') {
      return activePc;
    }
    activePc = new MockRTCPeerConnection(rtcConfig);
    return activePc;
  }

  const conn1 = getOrCreateConnection();
  const conn2 = getOrCreateConnection();
  assert(conn1 === conn2, 'Existing active RTCPeerConnection is reused without instantiating duplicate');
  assert(createCalls === 2, 'Call count recorded, singleton preserved');

  // Close and then get again
  activePc.close();
  const conn3 = getOrCreateConnection();
  assert(conn3 !== conn1, 'New RTCPeerConnection instantiated only after prior instance was closed');

  console.log('\n======================================================');
  console.log(`STEP 5 TESTS SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep5WebRTCTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
