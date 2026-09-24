import { useState, useEffect, useRef, useCallback } from 'react';
import { getWebRTCConfig } from '../../../services/webrtcConfig.js';
import socket from '../../../socket/socket.js';
import { SIGNALING_EVENTS } from '../constants/signalingEvents.js';

/**
 * Reusable WebRTC hook for peer-to-peer audio/video connection.
 *
 * Implements Step 5 of the WebRTC video-call system:
 * - Initializes RTCPeerConnection using centralized getWebRTCConfig()
 * - Binds local MediaStream tracks to the connection
 * - Negotiates Offer / Answer flow between Agent (offerer) and Customer (answerer)
 * - Exchanges ICE candidates with buffering to prevent race conditions
 * - Captures incoming remote MediaStream via ontrack
 * - Tracks connection states (new, connecting, connected, disconnected, failed, closed)
 * - Guarantees proper cleanup on call termination, navigation, or unmount
 * - Protects against duplicate peer connections during React re-renders
 *
 * @param {Object} params
 * @param {string} params.ticketId - Ticket identifier for room scoping
 * @param {Object} params.user - Decoded authenticated user with role
 * @param {MediaStream|null} params.localStream - Active local audio/video stream
 * @param {boolean} params.isEnded - Call ended flag
 */
export function useWebRTC({ ticketId, user, localStream, isEnded }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const [webRtcError, setWebRtcError] = useState(null);

  // References to preserve state across renders
  const pcRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const isNegotiatingRef = useRef(false);
  const hasOfferedRef = useRef(false);

  const cleanTicketId = (ticketId || '').replace('#', '');
  const isOfferer = (user?.role || '').toLowerCase() !== 'customer'; // Agent / Admin is offerer

  /**
   * Closes and cleanly destroys the active RTCPeerConnection and resets state.
   */
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onsignalingstatechange = null;
        pcRef.current.close();
      } catch (err) {
        console.warn('[useWebRTC] Error closing peer connection:', err);
      }
      pcRef.current = null;
    }

    candidateQueueRef.current = [];
    isNegotiatingRef.current = false;
    hasOfferedRef.current = false;
    setRemoteStream(null);
    setConnectionState('closed');
  }, []);

  /**
   * Flushes any ICE candidates that arrived before setRemoteDescription completed.
   */
  const drainCandidateQueue = useCallback(async (pc) => {
    if (!pc || !pc.remoteDescription) return;

    while (candidateQueueRef.current.length > 0) {
      const cand = candidateQueueRef.current.shift();
      if (!cand) continue;
      try {
        const candidateObj =
          typeof RTCIceCandidate !== 'undefined' && !(cand instanceof RTCIceCandidate)
            ? new RTCIceCandidate(cand)
            : cand;
        await pc.addIceCandidate(candidateObj);
      } catch (err) {
        console.warn('[useWebRTC] Failed to add queued ICE candidate:', err);
      }
    }
  }, []);

  /**
   * Initializes the RTCPeerConnection instance with event handlers.
   */
  const createPeerConnection = useCallback(() => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    setWebRtcError(null);
    const config = getWebRTCConfig();
    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    // 1. Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);

      if (state === 'failed') {
        setWebRtcError('Direct peer connection failed. Please check network firewall or VPN settings.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed') {
        setWebRtcError('Network ICE traversal failed.');
      }
    };

    // 2. ICE Candidate generation -> Relay over Socket.IO
    pc.onicecandidate = (event) => {
      if (event.candidate && cleanTicketId) {
        socket.emit(SIGNALING_EVENTS.ICE_CANDIDATE, {
          ticketNumber: cleanTicketId,
          ticketId: cleanIdFromTarget(cleanTicketId),
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    // 3. Remote Track Handling -> Construct remote MediaStream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prev) => {
          const stream = prev || new MediaStream();
          stream.addTrack(event.track);
          return stream;
        });
      }
    };

    return pc;
  }, [cleanTicketId]);

  /**
   * Helper to format ticket identifier
   */
  function cleanIdFromTarget(target) {
    return String(target || '').replace('#', '');
  }

  /**
   * Attaches local tracks to the peer connection
   */
  const syncLocalTracks = useCallback((pc, stream) => {
    if (!pc || !stream) return;

    const existingSenders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const sender = existingSenders.find((s) => s.track && s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).catch((err) => {
          console.warn('[useWebRTC] Failed to replaceTrack:', err);
        });
      } else {
        try {
          pc.addTrack(track, stream);
        } catch (err) {
          console.warn('[useWebRTC] Failed to addTrack:', err);
        }
      }
    });
  }, []);

  /**
   * Offerer Flow: Creates and emits WebRTC offer
   */
  const initiateOffer = useCallback(async (isRestart = false) => {
    if (isEnded || !cleanTicketId) return;

    const pc = createPeerConnection();
    if (localStream) {
      syncLocalTracks(pc, localStream);
    }

    if (isNegotiatingRef.current && !isRestart) return;
    isNegotiatingRef.current = true;

    try {
      setConnectionState('connecting');
      const offerOptions = (isRestart && hasOfferedRef.current) ? { iceRestart: true } : {};
      const offer = await pc.createOffer(offerOptions);
      await pc.setLocalDescription(offer);

      socket.emit(SIGNALING_EVENTS.WEBRTC_OFFER, {
        ticketNumber: cleanTicketId,
        ticketId: cleanTicketId,
        sdp: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      hasOfferedRef.current = true;
    } catch (err) {
      console.error('[useWebRTC] Failed to create offer:', err);
      setWebRtcError('Failed to negotiate video call offer.');
    } finally {
      isNegotiatingRef.current = false;
    }
  }, [cleanTicketId, createPeerConnection, isEnded, localStream, syncLocalTracks]);

  // Sync local tracks whenever localStream changes
  useEffect(() => {
    if (pcRef.current && localStream) {
      syncLocalTracks(pcRef.current, localStream);
    }
  }, [localStream, syncLocalTracks]);

  // Main Signaling Listeners
  useEffect(() => {
    if (isEnded || !cleanTicketId) return;

    // 1. Remote Offer received (Customer / Answerer flow)
    const handleRemoteOffer = async (data) => {
      const dataTicket = cleanIdFromTarget(data?.ticketNumber || data?.ticketId);
      if (dataTicket && dataTicket !== cleanTicketId) return;
      if (!data?.sdp) return;

      try {
        const pc = createPeerConnection();
        if (localStream) {
          syncLocalTracks(pc, localStream);
        }

        setConnectionState('connecting');
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await drainCandidateQueue(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit(SIGNALING_EVENTS.WEBRTC_ANSWER, {
          ticketNumber: cleanTicketId,
          ticketId: cleanTicketId,
          sdp: {
            type: answer.type,
            sdp: answer.sdp,
          },
        });
      } catch (err) {
        console.error('[useWebRTC] Failed to handle offer and create answer:', err);
        setWebRtcError('Failed to accept remote media offer.');
      }
    };

    // 2. Remote Answer received (Agent / Offerer flow)
    const handleRemoteAnswer = async (data) => {
      const dataTicket = cleanIdFromTarget(data?.ticketNumber || data?.ticketId);
      if (dataTicket && dataTicket !== cleanTicketId) return;
      if (!data?.sdp) return;

      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await drainCandidateQueue(pc);
      } catch (err) {
        console.error('[useWebRTC] Failed to set remote answer:', err);
        setWebRtcError('Failed to establish peer media connection with answer.');
      }
    };

    // 3. Remote ICE Candidate received
    const handleRemoteIceCandidate = async (data) => {
      const dataTicket = cleanIdFromTarget(data?.ticketNumber || data?.ticketId);
      if (dataTicket && dataTicket !== cleanTicketId) return;
      if (!data?.candidate) return;

      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
        // Buffer candidate until remote description is applied
        candidateQueueRef.current.push(data.candidate);
        return;
      }

      try {
        const candidateObj =
          typeof RTCIceCandidate !== 'undefined' && !(data.candidate instanceof RTCIceCandidate)
            ? new RTCIceCandidate(data.candidate)
            : data.candidate;
        await pc.addIceCandidate(candidateObj);
      } catch (err) {
        console.warn('[useWebRTC] Failed to add remote ICE candidate:', err);
      }
    };

    // 4. Remote peer announces arrival / acceptance in the room
    const handleCallAccepted = () => {
      // If we are the offerer (Agent) and haven't connected yet, trigger offer
      if (isOfferer && (!hasOfferedRef.current || connectionState !== 'connected')) {
        initiateOffer(true);
      }
    };

    socket.on(SIGNALING_EVENTS.WEBRTC_OFFER, handleRemoteOffer);
    socket.on(SIGNALING_EVENTS.WEBRTC_ANSWER, handleRemoteAnswer);
    socket.on(SIGNALING_EVENTS.ICE_CANDIDATE, handleRemoteIceCandidate);
    socket.on(SIGNALING_EVENTS.CALL_ACCEPTED, handleCallAccepted);

    return () => {
      socket.off(SIGNALING_EVENTS.WEBRTC_OFFER, handleRemoteOffer);
      socket.off(SIGNALING_EVENTS.WEBRTC_ANSWER, handleRemoteAnswer);
      socket.off(SIGNALING_EVENTS.ICE_CANDIDATE, handleRemoteIceCandidate);
      socket.off(SIGNALING_EVENTS.CALL_ACCEPTED, handleCallAccepted);
    };
  }, [
    cleanTicketId,
    createPeerConnection,
    drainCandidateQueue,
    initiateOffer,
    isEnded,
    isOfferer,
    localStream,
    syncLocalTracks,
    connectionState,
  ]);

  // Trigger initial offer if Agent and localStream is available
  useEffect(() => {
    if (isOfferer && localStream && !isEnded && cleanTicketId && !hasOfferedRef.current) {
      initiateOffer(false);
    }
  }, [isOfferer, localStream, isEnded, cleanTicketId, initiateOffer]);

  // Call ended cleanup
  useEffect(() => {
    if (isEnded) {
      closePeerConnection();
    }
  }, [isEnded, closePeerConnection]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      closePeerConnection();
    };
  }, [closePeerConnection]);

  return {
    remoteStream,
    connectionState,
    webRtcError,
    closePeerConnection,
  };
}

export default useWebRTC;
