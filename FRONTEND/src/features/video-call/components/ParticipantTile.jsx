import { useRef, useEffect, useCallback } from 'react';
import styles from './VideoCall.module.css';

export default function ParticipantTile({
  participant,
  isMainView = false,
  isScreenSharing = false,
  mediaStream = null,
  isLocal = false,
}) {
  const { name, role, initials, avatarBg, isMuted, isCameraOff } = participant;
  const videoRef = useRef(null);

  const handleVideoRef = useCallback(
    (node) => {
      videoRef.current = node;
      if (node && mediaStream) {
        node.srcObject = mediaStream;
      }
    },
    [mediaStream]
  );

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isCameraOff]);

  return (
    <div className={`${styles.participantTile} ${isMainView ? styles.mainViewTile : styles.pipTile}`}>
      {/* Screen Sharing Overlay View */}
      {isMainView && isScreenSharing ? (
        <div className={styles.screenShareCanvas}>
          <div className={styles.screenShareHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Screen Sharing Active — SupportDesk Desktop Console (v2.4)</span>
          </div>

          <div className={styles.screenMockGraphic}>
            <div className={styles.mockWindow}>
              <div className={styles.mockBar}>
                <span className={styles.mockDotRed} />
                <span className={styles.mockDotYellow} />
                <span className={styles.mockDotGreen} />
                <span className={styles.mockTitle}>Terminal & Diagnostic Stack Trace</span>
              </div>
              <div className={styles.mockCodeBody}>
                <code>[08:45:12] ERROR: Segmentation fault in BufferAlloc()</code>
                <code>[08:45:13] TRACE: Thread #4 terminated unexpectedly (0x7fff)</code>
                <code>[08:45:14] INFO: Agent Alex Johnson inspecting memory stack dump...</code>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Video Feed / Avatar Placeholder */
        <div className={styles.videoSurface}>
          {isCameraOff ? (
            <div className={styles.cameraOffOverlay}>
              <div className={styles.avatarLarge} style={{ background: avatarBg || '#0A84FF' }}>
                {initials}
              </div>
              <span className={styles.cameraOffText}>Camera Off</span>
            </div>
          ) : mediaStream ? (
            <>
              <video
                ref={handleVideoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`${styles.videoElement} ${isLocal ? styles.localVideoMirror : ''}`}
              />
              <div className={styles.videoStreamBadge}>
                {isLocal ? 'Local Camera • Live' : 'HD 1080p • Live Stream'}
              </div>
            </>
          ) : (
            <div className={styles.simulatedVideoFeed}>
              <div className={styles.avatarLarge} style={{ background: avatarBg || '#0A84FF' }}>
                {initials}
              </div>
              <div className={styles.videoStreamBadge}>HD 1080p • Live Stream</div>
            </div>
          )}
        </div>
      )}

      {/* Participant Info Overlay Bar */}
      <div className={styles.participantMeta}>
        <div className={styles.metaNameGroup}>
          <strong className={styles.participantName}>{name}</strong>
          <span className={styles.participantRole}>({role})</span>
        </div>

        <div className={styles.metaBadges}>
          {isMuted && (
            <span className={styles.mutedBadge} title="Microphone Muted">
              🔇 Muted
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
