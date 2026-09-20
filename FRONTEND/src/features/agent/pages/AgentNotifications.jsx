import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../notifications/context/NotificationContext';
import styles from './AgentNotifications.module.css';

function formatTime(createdAt, fallbackTime) {
  if (!createdAt && fallbackTime) return fallbackTime;
  if (!createdAt) return '';
  const date = new Date(createdAt);
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

export default function AgentNotifications() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleToggleRead = (id, e) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleItemClick = (notif) => {
    const id = notif.id || notif._id;
    const isUnread = !notif.read && notif.unread !== false;
    if (isUnread && id) {
      markAsRead(id);
    }
    if (notif.targetRoute) {
      navigate(notif.targetRoute);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && n.unread !== false).length;

  const filtered = notifications.filter((n) => {
    const isUnread = !n.read && n.unread !== false;
    if (filter === 'unread') return isUnread;
    return true;
  });

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'ticket_assigned':
      case 'assignment':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'ticket_reply':
      case 'reply':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'sla_warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'escalation':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        );
      case 'ticket_resolved':
      case 'resolution':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>REAL-TIME ALERTS</span>
          <h1 className={styles.title}>Agent Notifications</h1>
          <p className={styles.subtitle}>
            Stay updated on ticket assignments, SLA warnings, and customer communications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllBtn}
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === 'all' ? styles.activeTab : ''}`}
          onClick={() => setFilter('all')}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${filter === 'unread' ? styles.activeTab : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* List Card */}
      <div className={styles.listCard}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <h3 className={styles.emptyTitle}>No notifications</h3>
            <p className={styles.emptyDesc}>
              {filter === 'unread'
                ? "You've read all your notifications!"
                : 'No alerts found in your notifications log.'}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((item) => {
              const id = item.id || item._id;
              const isUnread = !item.read && item.unread !== false;
              return (
                <div
                  key={id}
                  className={`${styles.item} ${isUnread ? styles.unreadItem : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.leftMeta}>
                    {isUnread && <span className={styles.unreadDot} />}
                    <div
                      className={`${styles.typeIcon} ${
                        item.type === 'sla_warning' || item.type === 'escalation'
                          ? styles.urgentIcon
                          : ''
                      }`}
                    >
                      {renderTypeIcon(item.type)}
                    </div>
                  </div>

                  <div className={styles.info}>
                    <h4 className={styles.notifTitle}>{item.title}</h4>
                    <p className={styles.notifSub}>{item.message || item.subtitle}</p>
                    <span className={styles.time}>{formatTime(item.createdAt, item.time)}</span>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.toggleReadBtn}
                      onClick={(e) => handleToggleRead(id, e)}
                      title={isUnread ? 'Mark as read' : 'Read'}
                    >
                      {isUnread ? '● Mark read' : '✓ Read'}
                    </button>
                    <span className={styles.chevron}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
