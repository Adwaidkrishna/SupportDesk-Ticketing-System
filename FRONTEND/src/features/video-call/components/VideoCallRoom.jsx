import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { initialVideoCallState } from '../videoCallMockData';
import CallHeader from './CallHeader';
import ParticipantTile from './ParticipantTile';
import CallControls from './CallControls';
import InCallChat from './InCallChat';
import CallEndedScreen from './CallEndedScreen';
import styles from './VideoCall.module.css';

export default function VideoCallRoom() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [callState, setCallState] = useState({
    ...initialVideoCallState,
    ticketId: ticketId ? `#${ticketId}` : initialVideoCallState.ticketId,
  });

  const [seconds, setSeconds] = useState(callState.durationSeconds);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // Live Timer Count Up
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnded]);

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleToggleMute = () => {
    setCallState((prev) => ({
      ...prev,
      agent: { ...prev.agent, isMuted: !prev.agent.isMuted },
    }));
  };

  const handleToggleCamera = () => {
    setCallState((prev) => ({
      ...prev,
      agent: { ...prev.agent, isCameraOff: !prev.agent.isCameraOff },
    }));
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
      sender: 'agent',
      senderName: callState.agent.name,
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
    setIsEnded(true);
  };

  const handleReturnToTicket = () => {
    const cleanId = (ticketId || '1018').replace('#', '');
    // Navigate back to Agent or Customer ticket details
    navigate(`/agent/tickets/${cleanId}`);
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
        customerName={callState.customer.name}
        durationFormatted={formatDuration(seconds)}
        status="connected"
      />

      {/* Main Workspace Stage */}
      <div className={styles.stageContainer}>
        <div className={styles.videoStage}>
          {/* Main Feed: Customer Feed or Screen Share Canvas */}
          <ParticipantTile
            participant={callState.customer}
            isMainView={true}
            isScreenSharing={callState.isScreenSharing}
          />

          {/* Picture-in-Picture Floating Window: Agent Preview */}
          <ParticipantTile
            participant={callState.agent}
            isMainView={false}
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
        isMuted={callState.agent.isMuted}
        onToggleMute={handleToggleMute}
        isCameraOff={callState.agent.isCameraOff}
        onToggleCamera={handleToggleCamera}
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
