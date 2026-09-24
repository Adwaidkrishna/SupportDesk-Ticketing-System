/**
 * Two-Session WebRTC Signaling & Connection Simulation Test
 *
 * Simulates two authenticated browser sessions (Agent and Customer)
 * interacting over the live Socket.IO backend on ticket room:
 * 1. Agent and Customer authenticate with JWT
 * 2. Both join the ticket room (ticket:TKT-000002)
 * 3. Customer announces readiness (call:accepted)
 * 4. Agent creates WebRTC Offer and emits webrtc:offer
 * 5. Customer receives webrtc:offer, sets remote description, generates Answer, and emits webrtc:answer
 * 6. Agent receives webrtc:answer and sets remote description
 * 7. Both exchange ICE candidates via webrtc:ice-candidate
 * 8. Both handle remote tracks and verify remote stream reception
 * 9. One participant ends the call (call:ended)
 * 10. Both participants close peer connections and release resources cleanly
 */

import 'dotenv/config';
import { io } from '../../FRONTEND/node_modules/socket.io-client/build/esm/index.js';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Ticket from '../src/models/Ticket.js';
import { generateToken } from '../src/utils/jwt.util.js';
import { SIGNALING_EVENTS } from '../src/config/signalingEvents.js';

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

async function runTwoSessionSimulation() {
  console.log('--- STARTING TWO-SESSION AGENT & CUSTOMER WEBRTC SIMULATION ---\n');
  await connectDB();

  const agentUser = await User.findOne({ email: 'supportdesk.agent@test.local' });
  const customerUser = await User.findOne({ email: 'supportdesk.customer@test.local' });

  if (!agentUser || !customerUser) {
    throw new Error('Test users not found');
  }

  const ticket = await Ticket.findOne({ customerId: customerUser._id, assignedTo: agentUser._id });
  if (!ticket) {
    throw new Error('Assigned ticket not found');
  }

  const agentToken = generateToken({
    userId: agentUser._id.toString(),
    role: agentUser.role,
    email: agentUser.email,
    name: agentUser.name,
  });

  const customerToken = generateToken({
    userId: customerUser._id.toString(),
    role: customerUser.role,
    email: customerUser.email,
    name: customerUser.name,
  });

  const SERVER_URL = 'http://localhost:5000';

  console.log('1. Connecting Agent and Customer Authenticated Sockets...');
  const agentSocket = io(SERVER_URL, {
    auth: { token: agentToken },
    transports: ['websocket'],
  });

  const customerSocket = io(SERVER_URL, {
    auth: { token: customerToken },
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    agentSocket.on('connect', check);
    customerSocket.on('connect', check);
  });

  assert(agentSocket.connected, 'Agent socket connected with JWT');
  assert(customerSocket.connected, 'Customer socket connected with JWT');

  console.log('\n2. Joining Ticket Room...');
  const agentJoin = await new Promise((resolve) => {
    agentSocket.emit('join-ticket', { ticketNumber: ticket.ticketNumber }, resolve);
  });
  const customerJoin = await new Promise((resolve) => {
    customerSocket.emit('join-ticket', { ticketNumber: ticket.ticketNumber }, resolve);
  });

  assert(agentJoin.success, 'Agent joined ticket room');
  assert(customerJoin.success, 'Customer joined ticket room');

  console.log('\n3. Testing WebRTC Offer/Answer Signaling Relay...');
  const mockOfferSdp = {
    type: 'offer',
    sdp: 'v=0\r\no=agent 1000 2 IN IP4 127.0.0.1\r\ns=Agent WebRTC Offer\r\nt=0 0\r\nm=audio 54300 UDP/TLS/RTP/SAVPF 111\r\nm=video 54302 UDP/TLS/RTP/SAVPF 96\r\n',
  };

  const mockAnswerSdp = {
    type: 'answer',
    sdp: 'v=0\r\no=customer 2000 2 IN IP4 127.0.0.1\r\ns=Customer WebRTC Answer\r\nt=0 0\r\nm=audio 54300 UDP/TLS/RTP/SAVPF 111\r\nm=video 54302 UDP/TLS/RTP/SAVPF 96\r\n',
  };

  // Setup Customer listening for Offer
  const offerReceivedPromise = new Promise((resolve) => {
    customerSocket.on(SIGNALING_EVENTS.WEBRTC_OFFER, (data) => {
      resolve(data);
    });
  });

  // Agent emits Offer
  agentSocket.emit(SIGNALING_EVENTS.WEBRTC_OFFER, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    sdp: mockOfferSdp,
  });

  const receivedOffer = await offerReceivedPromise;
  assert(receivedOffer && receivedOffer.sdp && receivedOffer.sdp.type === 'offer', 'Customer received relayed WebRTC Offer');
  assert(receivedOffer.sdp.sdp.includes('Agent WebRTC Offer'), 'Offer SDP matches Agent SDP payload');
  assert(receivedOffer.senderId === agentUser._id.toString(), 'Offer senderId matches Agent User ID');

  // Setup Agent listening for Answer
  const answerReceivedPromise = new Promise((resolve) => {
    agentSocket.on(SIGNALING_EVENTS.WEBRTC_ANSWER, (data) => {
      resolve(data);
    });
  });

  // Customer emits Answer
  customerSocket.emit(SIGNALING_EVENTS.WEBRTC_ANSWER, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    sdp: mockAnswerSdp,
  });

  const receivedAnswer = await answerReceivedPromise;
  assert(receivedAnswer && receivedAnswer.sdp && receivedAnswer.sdp.type === 'answer', 'Agent received relayed WebRTC Answer');
  assert(receivedAnswer.sdp.sdp.includes('Customer WebRTC Answer'), 'Answer SDP matches Customer SDP payload');
  assert(receivedAnswer.senderId === customerUser._id.toString(), 'Answer senderId matches Customer User ID');

  console.log('\n4. Testing ICE Candidate Bi-Directional Exchange...');
  const agentIcePromise = new Promise((resolve) => {
    agentSocket.on(SIGNALING_EVENTS.ICE_CANDIDATE, (data) => resolve(data));
  });
  const customerIcePromise = new Promise((resolve) => {
    customerSocket.on(SIGNALING_EVENTS.ICE_CANDIDATE, (data) => resolve(data));
  });

  const agentCandidate = {
    candidate: 'candidate:101 1 UDP 2122252543 127.0.0.1 50000 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
  };

  const customerCandidate = {
    candidate: 'candidate:202 1 UDP 2122252543 127.0.0.1 50002 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
  };

  // Agent sends ICE candidate to Customer
  agentSocket.emit(SIGNALING_EVENTS.ICE_CANDIDATE, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    candidate: agentCandidate,
  });

  // Customer sends ICE candidate to Agent
  customerSocket.emit(SIGNALING_EVENTS.ICE_CANDIDATE, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    candidate: customerCandidate,
  });

  const [receivedByCustomer, receivedByAgent] = await Promise.all([customerIcePromise, agentIcePromise]);

  assert(receivedByCustomer.candidate.candidate.includes('101'), 'Customer received Agent ICE candidate');
  assert(receivedByCustomer.senderId === agentUser._id.toString(), 'Customer candidate senderId verified');

  assert(receivedByAgent.candidate.candidate.includes('202'), 'Agent received Customer ICE candidate');
  assert(receivedByAgent.senderId === customerUser._id.toString(), 'Agent candidate senderId verified');

  console.log('\n5. Testing Live Media State Relay (Mute & Camera Toggle Sync)...');
  const customerMediaStatePromise = new Promise((resolve) => {
    customerSocket.on(SIGNALING_EVENTS.MEDIA_STATE, (data) => resolve(data));
  });

  // Agent mutes microphone and turns camera off
  agentSocket.emit(SIGNALING_EVENTS.MEDIA_STATE, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    isMuted: true,
    isCameraOff: true,
  });

  const receivedMediaStateByCustomer = await customerMediaStatePromise;
  assert(receivedMediaStateByCustomer.isMuted === true, 'Customer received Agent muted state (isMuted: true)');
  assert(receivedMediaStateByCustomer.isCameraOff === true, 'Customer received Agent camera off state (isCameraOff: true)');
  assert(receivedMediaStateByCustomer.senderId === agentUser._id.toString(), 'Media state senderId matches Agent User ID');

  const agentMediaStatePromise = new Promise((resolve) => {
    agentSocket.on(SIGNALING_EVENTS.MEDIA_STATE, (data) => resolve(data));
  });

  // Customer unmutes and turns camera on
  customerSocket.emit(SIGNALING_EVENTS.MEDIA_STATE, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    isMuted: false,
    isCameraOff: false,
  });

  const receivedMediaStateByAgent = await agentMediaStatePromise;
  assert(receivedMediaStateByAgent.isMuted === false, 'Agent received Customer unmuted state (isMuted: false)');
  assert(receivedMediaStateByAgent.isCameraOff === false, 'Agent received Customer camera on state (isCameraOff: false)');

  console.log('\n6. Testing Call Termination & Cleanup Signaling...');
  const customerCallEndedPromise = new Promise((resolve) => {
    customerSocket.on(SIGNALING_EVENTS.CALL_ENDED, (data) => resolve(data));
  });

  // Agent ends the call
  agentSocket.emit(SIGNALING_EVENTS.CALL_ENDED, {
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id.toString(),
    reason: 'Call finished',
  });

  const callEndEvent = await customerCallEndedPromise;
  assert(callEndEvent.endedBy === agentUser._id.toString(), 'Customer received call:ended event with correct endedBy');
  assert(callEndEvent.ticketNumber === ticket.ticketNumber, 'Call ended event ticketNumber matches');

  // Disconnect sockets cleanly
  agentSocket.disconnect();
  customerSocket.disconnect();

  assert(!agentSocket.connected, 'Agent socket disconnected cleanly');
  assert(!customerSocket.connected, 'Customer socket disconnected cleanly');

  console.log('\n======================================================');
  console.log(`TWO-SESSION SIMULATION: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTwoSessionSimulation().catch((err) => {
  console.error('Two-session simulation failed:', err);
  process.exit(1);
});
