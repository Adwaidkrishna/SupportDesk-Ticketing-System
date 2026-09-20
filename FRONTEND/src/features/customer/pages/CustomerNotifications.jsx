import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../notifications/context/NotificationContext';
import styles from './CustomerNotifications.module.css';

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

/**
 * Customer Notifications page component.
 * Connected to live backend NotificationContext.
 * Allows filtering all/unread, marking notifications as read,
 * and navigating to associated tickets.
 */
export default function CustomerNotifications() {
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
      case 'ticket_reply':
      case 'reply':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'ticket_resolved':
      case 'status_changed':
      case 'status':
      case 'resolved':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'ticket_closed':
      case 'closed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
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
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            Stay updated on your ticket responses and status changes.
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

      {/* Notifications List */}
      <div className={styles.listCard}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No notifications</h3>
            <p className={styles.emptyDesc}>
              {filter === 'unread'
                ? "You've read all your notifications!"
                : 'No notifications available at this time.'}
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
                    <div className={styles.typeIcon}>{renderTypeIcon(item.type)}</div>
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
