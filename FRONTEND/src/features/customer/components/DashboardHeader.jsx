import styles from './DashboardHeader.module.css';

export default function DashboardHeader({ name = 'John', onCreateTicket }) {
  return (
    <div className={styles.header}>
      <div className={styles.titles}>
        <div className={styles.tagline}>— DASHBOARD</div>
        <h1 className={styles.greeting}>
          Hello, {name}! <span className={styles.wave}>👋</span>
        </h1>
        <p className={styles.subtitle}>
          Here&apos;s an overview of your support activity.
        </p>
      </div>

      <button
        type="button"
        className={styles.createButton}
        onClick={onCreateTicket}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Create Ticket</span>
      </button>
    </div>
  );
}
