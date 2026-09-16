import styles from './VideoCall.module.css';

export default function CallControls({
  isMuted,
  onToggleMute,
  isCameraOff,
  onToggleCamera,
  isScreenSharing,
  onToggleScreenShare,
  isChatOpen,
  onToggleChat,
  onEndCallClick,
}) {
  return (
    <div className={styles.controlsBar}>
      {/* Microphone Mute Toggle */}
      <button
        type="button"
        className={`${styles.controlBtn} ${isMuted ? styles.controlActiveRed : ''}`}
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isMuted ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        className={`${styles.controlBtn} ${isCameraOff ? styles.controlActiveRed : ''}`}
        onClick={onToggleCamera}
        aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCameraOff ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 21l-4.35-4.35M23 7l-7 5 7 5V7z" />
              <path d="M16 16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
            </>
          ) : (
            <>
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </>
          )}
        </svg>
        <span>{isCameraOff ? 'Camera Off' : 'Camera On'}</span>
      </button>

      {/* Screen Share Toggle */}
      <button
        type="button"
        className={`${styles.controlBtn} ${isScreenSharing ? styles.controlActiveBlue : ''}`}
        onClick={onToggleScreenShare}
        aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      {/* In-call Chat Toggle */}
      <button
        type="button"
        className={`${styles.controlBtn} ${isChatOpen ? styles.controlActiveBlue : ''}`}
        onClick={onToggleChat}
        aria-label="Toggle in-call chat"
        title="In-call Chat"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>In-Call Chat</span>
      </button>

      {/* End Call (Destructive Treatment) */}
      <button
        type="button"
        className={`${styles.controlBtn} ${styles.endCallBtn}`}
        onClick={onEndCallClick}
        aria-label="End video call"
        title="End Video Call"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.92 9.17 6.94 7 12 7s9.08 2.17 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        </svg>
        <span>End Call</span>
      </button>
    </div>
  );
}
