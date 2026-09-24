/**
 * WebRTC Signaling Event Names and Channel Constants (Backend)
 *
 * Centralized constants used across the Socket.IO signaling flow
 * to prevent magic strings and typos in call negotiation.
 */

export const SIGNALING_EVENTS = Object.freeze({
  // Call Lifecycle Initiation & Response
  CALL_INITIATE: 'call:initiate',
  CALL_INCOMING: 'call:incoming',
  CALL_ACCEPTED: 'call:accepted',
  CALL_DECLINED: 'call:declined',
  CALL_ENDED: 'call:ended',
  CALL_BUSY: 'call:busy',
  CALL_ERROR: 'call:error',

  // WebRTC Peer-to-Peer Negotiation (SDP & ICE)
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  ICE_CANDIDATE: 'webrtc:ice-candidate',

  // Call Control & Media Track State Synchronization
  MEDIA_STATE: 'call:media-state',
});

export default SIGNALING_EVENTS;
