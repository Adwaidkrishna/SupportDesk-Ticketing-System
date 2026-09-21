import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../notifications/context/NotificationContext';
import styles from './RecentNotifications.module.css';

/**
 * Format timestamp into human-readable relative time
 */
function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Render icon for notification type
 */
function renderNotifIcon(type) {
  switch (type) {
    case 'ticket_created':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'ticket_assigned':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'ticket_reply':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'ticket_resolved':
    case 'ticket_closed':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

export default function RecentNotifications({
  notifications = [],
  unreadCount = 0,
  onViewAll,
}) {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications() || {};

  const handleNotificationClick = (notif) => {
    const notifId = notif.id || notif._id;
    if (notifId && !notif.read && typeof markAsRead === 'function') {
      markAsRead(notifId);
    }

    if (notif.ticketId) {
      navigate(`/customer/tickets/${notif.ticketId}`);
    } else if (notif.targetRoute) {
      navigate(notif.targetRoute);
    } else {
      navigate('/customer/notifications');
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>Recent Notifications</h3>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
        <button
          type="button"
          className={styles.viewAllButton}
          onClick={onViewAll || (() => navigate('/customer/notifications'))}
        >
          View all →
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No notifications yet</p>
          <p className={styles.emptyDesc}>
            You&apos;re all caught up! Updates about your tickets will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((notif) => {
            const isUnread = !notif.read;
            const key = notif.id || notif._id || `${notif.createdAt}-${notif.title}`;

            return (
              <button
                key={key}
                type="button"
                className={`${styles.notifItem} ${isUnread ? styles.unreadItem : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div
                  className={`${styles.iconBox} ${isUnread ? styles.unreadIconBox : ''}`}
                >
                  {renderNotifIcon(notif.type)}
                </div>

                <div className={styles.content}>
                  <div className={styles.topRow}>
                    <h4 className={styles.notifTitle}>{notif.title}</h4>
                    <span className={styles.time}>
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className={styles.notifMessage}>{notif.message}</p>

                  {notif.ticketNumber && (
                    <span className={styles.ticketRef}>
                      Ticket #{notif.ticketNumber}
                    </span>
                  )}
                </div>

                {isUnread && <span className={styles.unreadDot} title="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
