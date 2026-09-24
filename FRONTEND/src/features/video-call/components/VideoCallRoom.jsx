import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import socket from '../../../socket/socket.js';
import { SIGNALING_EVENTS } from '../constants/signalingEvents.js';
import { initialVideoCallState } from '../videoCallMockData';
import useLocalMedia from '../hooks/useLocalMedia';
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
    ? callState.agent
    : callState.customer;

  // Live Timer Count Up
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnded]);

  // Join ticket socket room and listen for remote call end
  useEffect(() => {
    if (!ticketId) return;
    const cleanId = ticketId.replace('#', '');
    socket.emit('join-ticket', { ticketId: cleanId, ticketNumber: cleanId });

    const handleRemoteCallEnded = (data) => {
      const dataTicket = String(data?.ticketNumber || data?.ticketId || '').replace('#', '');
      if (!dataTicket || dataTicket === cleanId) {
        stopMedia();
        setIsEnded(true);
      }
    };

    socket.on(SIGNALING_EVENTS.CALL_ENDED, handleRemoteCallEnded);

    return () => {
      socket.off(SIGNALING_EVENTS.CALL_ENDED, handleRemoteCallEnded);
      socket.emit('leave-ticket', { ticketId: cleanId, ticketNumber: cleanId });
    };
  }, [ticketId, stopMedia]);

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
    setIsEndModalOpen(false);
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
      {/* Call Header */}
      <CallHeader
        ticketId={callState.ticketId}
        ticketSubject={callState.ticketSubject}
        customerName={isCustomer ? callState.agent.name : callState.customer.name}
        durationFormatted={formatDuration(seconds)}
        status="connected"
      />

      {/* Media Device Failure or Permission Denied Alert Banner */}
      {mediaError && (
        <div className={styles.mediaAlertBanner} role="alert">
          <div className={styles.mediaAlertLeft}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{mediaError}</span>
          </div>
          <button
            type="button"
            className={styles.mediaRetryBtn}
            onClick={startMedia}
          >
            ↻ Retry Device Access
          </button>
        </div>
      )}

      {/* Main Workspace Stage */}
      <div className={styles.stageContainer}>
        <div className={styles.videoStage}>
          {/* Main Feed: Remote Participant Feed (Mock) or Screen Share Canvas */}
          <ParticipantTile
            participant={remoteParticipant}
            isMainView={true}
            isScreenSharing={callState.isScreenSharing}
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
