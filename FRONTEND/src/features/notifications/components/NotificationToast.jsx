import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import styles from './NotificationToast.module.css';

export default function NotificationToast() {
  const { toastNotification, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!toastNotification) return null;

  const handleClick = () => {
    const id = toastNotification.id || toastNotification._id;
    if (id) {
      markAsRead(id);
    }
    dismissToast();
    if (toastNotification.targetRoute) {
      navigate(toastNotification.targetRoute);
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'ticket_reply':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'ticket_assigned':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'ticket_resolved':
      case 'status_changed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'ticket_closed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  return (
    <div className={styles.toastContainer}>
      <div className={styles.toastCard} onClick={handleClick} role="button" tabIndex={0}>
        <div className={styles.iconBadge}>{renderIcon(toastNotification.type)}</div>
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{toastNotification.title || 'New Notification'}</span>
            <span className={styles.tag}>NOW</span>
          </div>
          <p className={styles.message}>{toastNotification.message}</p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
