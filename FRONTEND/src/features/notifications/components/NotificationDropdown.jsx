import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../../auth/context/AuthContext';
import styles from './NotificationDropdown.module.css';

/**
 * Format timestamp into human readable relative string (e.g. '5m ago', '2h ago', 'Just now')
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

export default function NotificationDropdown({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (notif) => {
    const id = notif.id || notif._id;
    if (id && (!notif.read && notif.unread !== false)) {
      markAsRead(id);
    }
    onClose();

    if (notif.targetRoute) {
      navigate(notif.targetRoute);
    } else {
      const role = (user?.role || '').toLowerCase();
      if (role === 'agent') navigate('/agent/notifications');
      else if (role === 'customer') navigate('/customer/notifications');
    }
  };

  const handleViewAll = () => {
    onClose();
    const role = (user?.role || '').toLowerCase();
    if (role === 'agent') {
      navigate('/agent/notifications');
    } else if (role === 'customer') {
      navigate('/customer/notifications');
    } else {
      navigate('/admin/reports');
    }
  };

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'ticket_reply':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.typeSvg}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'ticket_assigned':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.typeSvg}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'ticket_resolved':
      case 'status_changed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.typeSvg}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'ticket_closed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.typeSvg}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.typeSvg}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  const displayedList = notifications.slice(0, 7);

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>Notifications</span>
          {unreadCount > 0 && <span className={styles.unreadCountBadge}>{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllBtn}
            onClick={markAllAsRead}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className={styles.list}>
        {isLoading && notifications.length === 0 ? (
          <div className={styles.emptyState}>Loading notifications...</div>
        ) : displayedList.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔔</span>
            <p className={styles.emptyText}>No notifications yet</p>
          </div>
        ) : (
          displayedList.map((item) => {
            const id = item.id || item._id;
            const isUnread = !item.read && item.unread !== false;
            return (
              <div
                key={id}
                className={`${styles.item} ${isUnread ? styles.unread : ''}`}
                onClick={() => handleItemClick(item)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.itemIconCol}>
                  <div className={`${styles.iconWrap} ${isUnread ? styles.unreadIconWrap : ''}`}>
                    {renderTypeIcon(item.type)}
                  </div>
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemTime}>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  <p className={styles.itemMessage}>{item.message || item.subtitle}</p>
                </div>

                {isUnread && <span className={styles.dot} />}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button type="button" className={styles.viewAllBtn} onClick={handleViewAll}>
          View all notifications →
        </button>
      </div>
    </div>
  );
}
