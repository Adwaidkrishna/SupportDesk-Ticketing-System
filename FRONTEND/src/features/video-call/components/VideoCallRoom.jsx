import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import { SIGNALING_EVENTS } from '../constants/signalingEvents.js';
import { initialVideoCallState } from '../videoCallMockData';
import useLocalMedia from '../hooks/useLocalMedia';
import useWebRTC from '../hooks/useWebRTC';
import CallHeader from './CallHeader';
import ParticipantTile from './ParticipantTile';
import CallControls from './CallControls';
import InCallChat from './InCallChat';
import CallEndedScreen from './CallEndedScreen';
import styles from './VideoCall.module.css';

export default function VideoCallRoom() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [callState, setCallState] = useState({
    ...initialVideoCallState,
    ticketId: ticketId ? `#${ticketId}` : initialVideoCallState.ticketId,
  });

  const [seconds, setSeconds] = useState(callState.durationSeconds);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // Real local media hook: camera and microphone access & lifecycle
  const {
    mediaStream,
    error: mediaError,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    stopMedia,
    startMedia,
  } = useLocalMedia();

  // Peer-to-peer WebRTC connection hook
  const {
    remoteStream,
    connectionState,
    webRtcError,
    restartConnection,
    closePeerConnection,
  } = useWebRTC({
    ticketId,
    user,
    localStream: mediaStream,
    isEnded,
  });

  // Track remote participant mute & camera-off state
  const [remoteMediaState, setRemoteMediaState] = useState({
    isMuted: false,
    isCameraOff: false,
  });

  const isEndedRef = useRef(false);

  // Keep isEndedRef in sync
  useEffect(() => {
    isEndedRef.current = isEnded;
  }, [isEnded]);

  // Determine local vs remote participant based on user role
  const isCustomer = user?.role === 'customer';

  const localParticipant = isCustomer
    ? {
        ...callState.customer,
        name: user?.name || callState.customer.name,
        isMuted,
        isCameraOff,
      }
    : {
        ...callState.agent,
        name: user?.name || callState.agent.name,
        isMuted,
        isCameraOff,
      };

  const remoteParticipant = isCustomer
    ? {
        ...callState.agent,
        isMuted: remoteMediaState.isMuted,
        isCameraOff: remoteMediaState.isCameraOff,
      }
    : {
        ...callState.customer,
        isMuted: remoteMediaState.isMuted,
        isCameraOff: remoteMediaState.isCameraOff,
      };

  // Live Timer Count Up
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnded]);

  // Sync local microphone/camera state to remote peer over signaling
  useEffect(() => {
    if (!ticketId || isEnded) return;
    const cleanId = ticketId.replace('#', '');
    socket.emit(SIGNALING_EVENTS.MEDIA_STATE, {
      ticketNumber: cleanId,
      ticketId: cleanId,
      isMuted,
      isCameraOff,
    });
  }, [ticketId, isMuted, isCameraOff, isEnded]);

  // Listen for remote track mute/unmute events on incoming remoteStream
  useEffect(() => {
    if (!remoteStream) return;
    const videoTrack = remoteStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const handleVideoMute = () => {
      setRemoteMediaState((prev) => ({ ...prev, isCameraOff: true }));
    };
    const handleVideoUnmute = () => {
      setRemoteMediaState((prev) => ({ ...prev, isCameraOff: false }));
    };

    videoTrack.addEventListener('mute', handleVideoMute);
    videoTrack.addEventListener('unmute', handleVideoUnmute);

    return () => {
      videoTrack.removeEventListener('mute', handleVideoMute);
      videoTrack.removeEventListener('unmute', handleVideoUnmute);
    };
  }, [remoteStream]);

  // Join ticket socket room and listen for remote call end and media state events
  useEffect(() => {
    if (!ticketId) return;
    const cleanId = ticketId.replace('#', '');
    socket.emit('join-ticket', { ticketId: cleanId, ticketNumber: cleanId }, (res) => {
      if (res?.success && isCustomer) {
        // Notify room that customer is in the call room to prompt offer negotiation
        socket.emit(SIGNALING_EVENTS.CALL_ACCEPTED, { ticketNumber: cleanId, ticketId: cleanId });
      }
    });

    const handleRemoteCallEnded = (data) => {
      const dataTicket = String(data?.ticketNumber || data?.ticketId || '').replace('#', '');
      if (!dataTicket || dataTicket === cleanId) {
        isEndedRef.current = true;
        closePeerConnection();
        stopMedia();
        setIsEnded(true);
      }
    };

    const handleRemoteMediaState = (data) => {
      const dataTicket = String(data?.ticketNumber || data?.ticketId || '').replace('#', '');
      if (!dataTicket || dataTicket === cleanId) {
        setRemoteMediaState({
          isMuted: Boolean(data?.isMuted),
          isCameraOff: Boolean(data?.isCameraOff),
        });
      }
    };

    socket.on(SIGNALING_EVENTS.CALL_ENDED, handleRemoteCallEnded);
    socket.on(SIGNALING_EVENTS.MEDIA_STATE, handleRemoteMediaState);

    // Browser close / navigation away handler to avoid leaving active sessions
    const handleBeforeUnload = () => {
      if (!isEndedRef.current) {
        isEndedRef.current = true;
        socket.emit(SIGNALING_EVENTS.CALL_ENDED, {
          ticketNumber: cleanId,
          ticketId: cleanId,
          reason: 'Participant disconnected or closed tab',
        });
        stopMedia();
        closePeerConnection();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off(SIGNALING_EVENTS.CALL_ENDED, handleRemoteCallEnded);
      socket.off(SIGNALING_EVENTS.MEDIA_STATE, handleRemoteMediaState);

      // If component unmounts before explicit end call, cleanly notify and release hardware
      if (!isEndedRef.current) {
        isEndedRef.current = true;
        socket.emit(SIGNALING_EVENTS.CALL_ENDED, {
          ticketNumber: cleanId,
          ticketId: cleanId,
          reason: 'Participant navigated away from call',
        });
      }

      closePeerConnection();
      stopMedia();
      socket.emit('leave-ticket', { ticketId: cleanId, ticketNumber: cleanId });
    };
  }, [ticketId, stopMedia, closePeerConnection, isCustomer]);

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleToggleScreenShare = () => {
    setCallState((prev) => ({
      ...prev,
      isScreenSharing: !prev.isScreenSharing,
    }));
  };

  const handleToggleChat = () => {
    setCallState((prev) => ({
      ...prev,
      isChatOpen: !prev.isChatOpen,
    }));
  };

  const handleSendChatMessage = (text) => {
    const newMsg = {
      id: `icm_${Date.now()}`,
      sender: isCustomer ? 'customer' : 'agent',
      senderName: localParticipant.name,
      time: 'Just now',
      text,
    };
    setCallState((prev) => ({
      ...prev,
      inCallMessages: [...prev.inCallMessages, newMsg],
    }));
  };

  const handleConfirmEndCall = () => {
    isEndedRef.current = true;
    setIsEndModalOpen(false);
    closePeerConnection();
    stopMedia();
    setIsEnded(true);
    const cleanId = (ticketId || '1018').replace('#', '');
    socket.emit(SIGNALING_EVENTS.CALL_ENDED, {
      ticketNumber: cleanId,
      ticketId: cleanId,
      reason: 'Call ended by participant',
    });
  };

  const handleReturnToTicket = () => {
    isEndedRef.current = true;
    closePeerConnection();
    stopMedia();
    const cleanId = (ticketId || '1018').replace('#', '');
    if (user?.role === 'customer') {
      navigate(`/customer/tickets/${cleanId}`);
    } else {
      navigate(`/agent/tickets/${cleanId}`);
    }
  };

  if (isEnded) {
    return (
      <div className={styles.roomPage}>
        <CallEndedScreen
          ticketId={callState.ticketId}
          durationText={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}
          participants={[callState.agent.name, callState.customer.name]}
          onReturnToTicket={handleReturnToTicket}
        />
      </div>
    );
  }

  return (
    <div className={styles.roomPage}>
      {/* Call Header with live connection state */}
      <CallHeader
        ticketId={callState.ticketId}
        ticketSubject={callState.ticketSubject}
        customerName={isCustomer ? callState.agent.name : callState.customer.name}
        durationFormatted={formatDuration(seconds)}
        status={connectionState}
      />

      {/* Media Device Failure or WebRTC Error Alert Banner */}
      {(mediaError || webRtcError) && (
        <div className={styles.mediaAlertBanner} role="alert">
          <div className={styles.mediaAlertLeft}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{mediaError || webRtcError}</span>
          </div>
          {mediaError && (
            <button
              type="button"
              className={styles.mediaRetryBtn}
              onClick={startMedia}
            >
              ↻ Retry Device Access
            </button>
          )}
          {!mediaError && webRtcError && (
            <button
              type="button"
              className={styles.mediaRetryBtn}
              onClick={restartConnection}
            >
              ↻ Reconnect Call
            </button>
          )}
        </div>
      )}

      {/* Main Workspace Stage */}
      <div className={styles.stageContainer}>
        <div className={styles.videoStage}>
          {/* Main Feed: Remote Participant Feed (WebRTC Remote MediaStream) or Screen Share Canvas */}
          <ParticipantTile
            participant={remoteParticipant}
            isMainView={true}
            isScreenSharing={callState.isScreenSharing}
            mediaStream={remoteStream}
            isLocal={false}
          />

          {/* Picture-in-Picture Floating Window: Local Participant Camera Feed */}
          <ParticipantTile
            participant={localParticipant}
            isMainView={false}
            mediaStream={mediaStream}
            isLocal={true}
          />
        </div>

        {/* Slide-Out In-Call Chat Panel */}
        {callState.isChatOpen && (
          <InCallChat
            messages={callState.inCallMessages}
            onSendMessage={handleSendChatMessage}
            onClose={() => setCallState((prev) => ({ ...prev, isChatOpen: false }))}
          />
        )}
      </div>

      {/* Controls Footer */}
      <CallControls
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isCameraOff={isCameraOff}
        onToggleCamera={toggleCamera}
        isScreenSharing={callState.isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        isChatOpen={callState.isChatOpen}
        onToggleChat={handleToggleChat}
        onEndCallClick={() => setIsEndModalOpen(true)}
      />

      {/* End Call Confirmation Modal */}
      {isEndModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEndModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>End Video Call?</h3>
            <p className={styles.modalText}>
              The call will be disconnected for all participants and a summary entry will be logged in ticket activity.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsEndModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.endConfirmBtn}
                onClick={handleConfirmEndCall}
              >
                End Call Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
