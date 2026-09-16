import styles from './VideoCall.module.css';

export default function IncomingCallBanner({ agentName, ticketId, ticketSubject, onDecline, onJoin }) {
  return (
    <div className={styles.incomingCallBanner}>
      <div className={styles.incomingLeft}>
        <div className={styles.pulseIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div className={styles.incomingText}>
          <span className={styles.incomingTag}>INCOMING VIDEO CALL REQUEST</span>
          <h4 className={styles.incomingTitle}>{agentName || 'Alex Johnson'} (Support Agent)</h4>
          <p className={styles.incomingSub}>
            Ticket {ticketId || '#1018'} — {ticketSubject || 'Application crashes on startup'}
          </p>
        </div>
      </div>

      <div className={styles.incomingActions}>
        <button type="button" className={styles.declineBtn} onClick={onDecline}>
          Decline
        </button>
        <button type="button" className={styles.joinCallBtn} onClick={onJoin}>
          📹 Join Video Call
        </button>
      </div>
    </div>
  );
}
