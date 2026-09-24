import styles from './VideoCall.module.css';

export default function CallHeader({ ticketId, ticketSubject, customerName, durationFormatted, status }) {
  const isConnected = status === 'connected';
  const isFailed = status === 'failed' || status === 'closed';

  let statusLabel = 'Connecting...';
  let pillClass = `${styles.statusPill} ${styles.statusPillConnecting}`;
  let dotClass = `${styles.statusDot} ${styles.statusDotConnecting}`;

  if (isConnected) {
    statusLabel = 'Connected';
    pillClass = styles.statusPill;
    dotClass = styles.statusDot;
  } else if (isFailed) {
    statusLabel = status === 'failed' ? 'Connection Failed' : 'Call Closed';
    pillClass = `${styles.statusPill} ${styles.statusPillFailed}`;
    dotClass = `${styles.statusDot} ${styles.statusDotFailed}`;
  } else if (status === 'disconnected') {
    statusLabel = 'Reconnecting...';
    pillClass = `${styles.statusPill} ${styles.statusPillConnecting}`;
    dotClass = `${styles.statusDot} ${styles.statusDotConnecting}`;
  }

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
        <div className={pillClass}>
          <span className={dotClass} />
          <span>{statusLabel}</span>
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
