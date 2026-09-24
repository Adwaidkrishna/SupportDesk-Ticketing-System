import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';
import { SIGNALING_EVENTS } from '../../config/signalingEvents.js';

/**
 * Validates and retrieves the ticket, checking whether the authenticated socket user
 * is authorized to participate in a video call for this ticket.
 *
 * Authorization rules:
 * - Admin: can participate on any ticket.
 * - Customer: can only participate on their own ticket (matching customerId).
 * - Agent: can only participate on tickets assigned to them (matching assignedTo).
 *
 * @param {string} target - Ticket ID or ticketNumber
 * @param {Object} user - Decoded JWT user from socket.user
 * @returns {Promise<{ authorized: boolean, ticket?: Object, error?: string }>}
 */
export const authorizeCallParticipant = async (target, user) => {
  if (!target || typeof target !== 'string') {
    return { authorized: false, error: 'Ticket identifier is required' };
  }

  if (!user || !user.userId) {
    return { authorized: false, error: 'Authentication required' };
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(target);
  const query = isObjectId ? { _id: target } : { ticketNumber: target };
  const ticket = await Ticket.findOne(query);

  if (!ticket) {
    return { authorized: false, error: 'Ticket not found' };
  }

  const userRole = (user.role || '').toLowerCase();
  const userId = String(user.userId);

  if (userRole === 'admin') {
    return { authorized: true, ticket };
  }

  if (userRole === 'customer') {
    if (String(ticket.customerId) === userId) {
      return { authorized: true, ticket };
    }
    return { authorized: false, error: 'Access denied: You do not own this ticket' };
  }

  if (userRole === 'agent') {
    if (!ticket.assignedTo) {
      return { authorized: false, error: 'Access denied: Ticket is unassigned' };
    }
    if (String(ticket.assignedTo) === userId) {
      return { authorized: true, ticket };
    }
    return { authorized: false, error: 'Access denied: You are not assigned to this ticket' };
  }

  return { authorized: false, error: 'Access denied: Unauthorized role' };
};

/**
 * Registers WebRTC signaling event handlers on an active, authenticated socket connection.
 * Relays call lifecycle and WebRTC offer/answer/ICE candidate packets only within the
 * authorized ticket room: `ticket:${ticketNumber}`.
 *
 * @param {import('socket.io').Server} io - Main Socket.IO server instance
 * @param {import('socket.io').Socket} socket - Authenticated client socket
 */
export const registerWebRtcHandlers = (io, socket) => {
  /**
   * Helper to notify the caller of an error via acknowledgment or error event
   */
  const reportError = (callback, message, code = 'SIGNALING_ERROR') => {
    if (typeof callback === 'function') {
      callback({ success: false, error: message, code });
    } else {
      socket.emit(SIGNALING_EVENTS.CALL_ERROR, { error: message, code });
    }
  };

  /**
   * 1. CALL INITIATE
   * Triggered by caller (typically Agent) to ring the recipient.
   * Expects payload: { ticketNumber | ticketId, callerName? }
   */
  socket.on(SIGNALING_EVENTS.CALL_INITIATE, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      // Broadcast incoming call alert to everyone else in the canonical ticket room
      const callData = {
        ticketNumber: auth.ticket.ticketNumber,
        ticketId: auth.ticket._id.toString(),
        ticketSubject: auth.ticket.subject,
        callerId: socket.user.userId,
        callerRole: socket.user.role,
        callerName: data?.callerName || socket.user.name || 'Support Agent',
        sender: {
          id: socket.user.userId,
          role: socket.user.role,
        },
      };

      socket.to(room).emit(SIGNALING_EVENTS.CALL_INCOMING, callData);
      socket.to(room).emit(SIGNALING_EVENTS.CALL_INITIATE, callData);

      if (typeof callback === 'function') {
        callback({
          success: true,
          ticketNumber: auth.ticket.ticketNumber,
          room,
        });
      }
    } catch (err) {
      console.error('Error in call:initiate handler:', err);
      reportError(callback, 'Failed to initiate video call');
    }
  });

  /**
   * 2. CALL ACCEPTED
   * Triggered when recipient clicks 'Accept' / 'Join Video Call'.
   * Expects payload: { ticketNumber | ticketId }
   */
  socket.on(SIGNALING_EVENTS.CALL_ACCEPTED, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      // Relay acceptance to the peer in the ticket room
      socket.to(room).emit(SIGNALING_EVENTS.CALL_ACCEPTED, {
        ticketNumber: auth.ticket.ticketNumber,
        acceptedBy: socket.user.userId,
        acceptedRole: socket.user.role,
      });

      if (typeof callback === 'function') {
        callback({ success: true, ticketNumber: auth.ticket.ticketNumber });
      }
    } catch (err) {
      console.error('Error in call:accepted handler:', err);
      reportError(callback, 'Failed to process call acceptance');
    }
  });

  /**
   * 3. CALL DECLINED
   * Triggered when recipient declines the call invitation.
   * Expects payload: { ticketNumber | ticketId, reason? }
   */
  socket.on(SIGNALING_EVENTS.CALL_DECLINED, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.CALL_DECLINED, {
        ticketNumber: auth.ticket.ticketNumber,
        declinedBy: socket.user.userId,
        reason: data?.reason || 'Call declined by participant',
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in call:declined handler:', err);
      reportError(callback, 'Failed to decline call');
    }
  });

  /**
   * 4. CALL BUSY
   * Triggered when recipient is already in another call or unable to receive.
   * Expects payload: { ticketNumber | ticketId }
   */
  socket.on(SIGNALING_EVENTS.CALL_BUSY, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.CALL_BUSY, {
        ticketNumber: auth.ticket.ticketNumber,
        busyUser: socket.user.userId,
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in call:busy handler:', err);
      reportError(callback, 'Failed to send call busy status');
    }
  });

  /**
   * 5. CALL ENDED
   * Triggered when either participant disconnects or hangs up.
   * Expects payload: { ticketNumber | ticketId, reason? }
   */
  socket.on(SIGNALING_EVENTS.CALL_ENDED, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.CALL_ENDED, {
        ticketNumber: auth.ticket.ticketNumber,
        endedBy: socket.user.userId,
        reason: data?.reason || 'Call ended by participant',
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in call:ended handler:', err);
      reportError(callback, 'Failed to end call');
    }
  });

  /**
   * 6. WEBRTC OFFER
   * Relays SDP offer from caller to callee.
   * Expects payload: { ticketNumber | ticketId, sdp: RTCSessionDescriptionInit }
   */
  socket.on(SIGNALING_EVENTS.WEBRTC_OFFER, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId;
      if (!data?.sdp) {
        return reportError(callback, 'SDP offer is required', 'INVALID_PAYLOAD');
      }

      const auth = await authorizeCallParticipant(target, socket.user);
      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.WEBRTC_OFFER, {
        ticketNumber: auth.ticket.ticketNumber,
        sdp: data.sdp,
        senderId: socket.user.userId,
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in webrtc:offer handler:', err);
      reportError(callback, 'Failed to relay WebRTC offer');
    }
  });

  /**
   * 7. WEBRTC ANSWER
   * Relays SDP answer from callee back to caller.
   * Expects payload: { ticketNumber | ticketId, sdp: RTCSessionDescriptionInit }
   */
  socket.on(SIGNALING_EVENTS.WEBRTC_ANSWER, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId;
      if (!data?.sdp) {
        return reportError(callback, 'SDP answer is required', 'INVALID_PAYLOAD');
      }

      const auth = await authorizeCallParticipant(target, socket.user);
      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.WEBRTC_ANSWER, {
        ticketNumber: auth.ticket.ticketNumber,
        sdp: data.sdp,
        senderId: socket.user.userId,
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in webrtc:answer handler:', err);
      reportError(callback, 'Failed to relay WebRTC answer');
    }
  });

  /**
   * 8. WEBRTC ICE CANDIDATE
   * Relays ICE candidates between peers for NAT traversal.
   * Expects payload: { ticketNumber | ticketId, candidate: RTCIceCandidateInit }
   */
  socket.on(SIGNALING_EVENTS.ICE_CANDIDATE, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId;
      if (!data?.candidate) {
        return reportError(callback, 'ICE candidate is required', 'INVALID_PAYLOAD');
      }

      const auth = await authorizeCallParticipant(target, socket.user);
      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.ICE_CANDIDATE, {
        ticketNumber: auth.ticket.ticketNumber,
        candidate: data.candidate,
        senderId: socket.user.userId,
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in webrtc:ice-candidate handler:', err);
      reportError(callback, 'Failed to relay ICE candidate');
    }
  });

  /**
   * 9. CALL ERROR
   * Triggered when a participant encounters a media/connection error and notifies the room.
   * Expects payload: { ticketNumber | ticketId, message?, error?, code? }
   */
  socket.on(SIGNALING_EVENTS.CALL_ERROR, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.CALL_ERROR, {
        ticketNumber: auth.ticket.ticketNumber,
        senderId: socket.user.userId,
        message: data?.message || data?.error || 'Call error reported by participant',
        code: data?.code || 'PEER_ERROR',
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in call:error handler:', err);
      reportError(callback, 'Failed to relay call error');
    }
  });

  /**
   * 10. CALL MEDIA STATE
   * Relays microphone mute and camera on/off states between participants.
   * Expects payload: { ticketNumber | ticketId, isMuted?, isCameraOff? }
   */
  socket.on(SIGNALING_EVENTS.MEDIA_STATE, async (data, callback) => {
    try {
      const target = data?.ticketNumber || data?.ticketId || (typeof data === 'string' ? data : null);
      const auth = await authorizeCallParticipant(target, socket.user);

      if (!auth.authorized) {
        return reportError(callback, auth.error, 'UNAUTHORIZED');
      }

      const room = `ticket:${auth.ticket.ticketNumber}`;

      socket.to(room).emit(SIGNALING_EVENTS.MEDIA_STATE, {
        ticketNumber: auth.ticket.ticketNumber,
        senderId: socket.user.userId,
        isMuted: typeof data?.isMuted === 'boolean' ? data.isMuted : false,
        isCameraOff: typeof data?.isCameraOff === 'boolean' ? data.isCameraOff : false,
        isScreenSharing: typeof data?.isScreenSharing === 'boolean' ? data.isScreenSharing : false,
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error in call:media-state handler:', err);
      reportError(callback, 'Failed to relay media state');
    }
  });
};

export default registerWebRtcHandlers;
