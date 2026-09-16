import styles from './VideoCall.module.css';

export default function CallEndedScreen({ ticketId, durationText, participants, onReturnToTicket }) {
  return (
    <div className={styles.callEndedCard}>
      <div className={styles.endedIconBox}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6" />
          <path d="M9 9l6 6" />
        </svg>
      </div>

      <h2 className={styles.endedTitle}>Video Call Ended</h2>
      <p className={styles.endedSub}>The call session has disconnected. Call details have been saved to ticket activity history.</p>

      <div className={styles.endedStatsGrid}>
        <div className={styles.endedStatRow}>
          <span>Ticket Reference</span>
          <strong>{ticketId || '#1018'}</strong>
        </div>
        <div className={styles.endedStatRow}>
          <span>Call Duration</span>
          <strong>{durationText || '14 minutes 32 seconds'}</strong>
        </div>
        <div className={styles.endedStatRow}>
          <span>Participants</span>
          <strong>{participants ? participants.join(', ') : 'Alex Johnson, Rahul Sharma'}</strong>
        </div>
        <div className={styles.endedStatRow}>
          <span>Call Status</span>
          <strong style={{ color: '#30D158' }}>Completed</strong>
        </div>
      </div>

      <button type="button" className={styles.returnTicketBtn} onClick={onReturnToTicket}>
        Return to Ticket Details →
      </button>
    </div>
  );
}
