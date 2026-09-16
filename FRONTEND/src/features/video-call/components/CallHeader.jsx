import styles from './VideoCall.module.css';

export default function CallHeader({ ticketId, ticketSubject, customerName, durationFormatted, status }) {
  return (
    <div className={styles.callHeader}>
      <div className={styles.headerLeft}>
        <span className={styles.ticketBadge}>{ticketId || '#1018'}</span>
        <div className={styles.headerTitles}>
          <h2 className={styles.headerSubject}>{ticketSubject || 'Application crashes on startup'}</h2>
          <span className={styles.headerCustomer}>Customer: {customerName || 'Rahul Sharma'}</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} />
          <span>{status === 'connected' ? 'Connected' : 'Calling...'}</span>
        </div>
        <div className={styles.durationTimer}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{durationFormatted}</span>
        </div>
      </div>
    </div>
  );
}
