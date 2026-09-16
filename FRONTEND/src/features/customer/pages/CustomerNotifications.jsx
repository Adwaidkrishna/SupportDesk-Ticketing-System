import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerNotifications.module.css';

const initialNotifications = [
  {
    id: 'notif_1',
    title: 'Agent Alex replied to Ticket #1024',
    subtitle: 'Login issue on web app',
    time: '5 minutes ago',
    unread: true,
    targetRoute: '/customer/tickets/1024',
    type: 'reply',
  },
  {
    id: 'notif_2',
    title: 'Ticket #1023 status changed',
    subtitle: 'Status updated to: Waiting for You',
    time: '2 hours ago',
    unread: true,
    targetRoute: '/customer/tickets/1023',
    type: 'status',
  },
  {
    id: 'notif_3',
    title: 'Ticket #1022 resolved',
    subtitle: 'Feature request - Dark mode has been marked as resolved',
    time: '1 day ago',
    unread: true,
    targetRoute: '/customer/tickets/1022',
    type: 'resolved',
  },
  {
    id: 'notif_4',
    title: 'Ticket #1021 closed',
    subtitle: 'Billing inquiry ticket closed automatically',
    time: '3 days ago',
    unread: false,
    targetRoute: '/customer/tickets/1021',
    type: 'closed',
  },
  {
    id: 'notif_5',
    title: 'Welcome to SupportDesk!',
    subtitle: 'Explore our Knowledge Base for quick answers to common questions.',
    time: '1 week ago',
    unread: false,
    targetRoute: '/customer/knowledge-base',
    type: 'system',
  },
];

/**
 * Customer Notifications page component.
 * Allows filtering all/unread, marking notifications as read,
 * and navigating to associated tickets.
 */
export default function CustomerNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all');

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleToggleRead = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: !item.unread } : item))
    );
  };

  const handleItemClick = (notif) => {
    // Mark as read when clicked
    setNotifications((prev) =>
      prev.map((item) => (item.id === notif.id ? { ...item, unread: false } : item))
    );
    navigate(notif.targetRoute);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return n.unread;
    return true;
  });

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'reply':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'status':
      case 'resolved':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
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

        <button
          type="button"
          className={styles.markAllBtn}
          onClick={handleMarkAllAsRead}
        >
          Mark all as read
        </button>
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
          Unread ({notifications.filter((n) => n.unread).length})
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
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`${styles.item} ${item.unread ? styles.unreadItem : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <div className={styles.leftMeta}>
                  {item.unread && <span className={styles.unreadDot} />}
                  <div className={styles.typeIcon}>{renderTypeIcon(item.type)}</div>
                </div>

                <div className={styles.info}>
                  <h4 className={styles.notifTitle}>{item.title}</h4>
                  <p className={styles.notifSub}>{item.subtitle}</p>
                  <span className={styles.time}>{item.time}</span>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.toggleReadBtn}
                    onClick={(e) => handleToggleRead(item.id, e)}
                    title={item.unread ? 'Mark as read' : 'Mark as unread'}
                  >
                    {item.unread ? '● Mark read' : '○ Mark unread'}
                  </button>
                  <span className={styles.chevron}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
