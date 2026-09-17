import styles from './Toast.module.css';

/**
 * Reusable Toast Alert Notification Component
 * 
 * @param {'success' | 'error' | 'warning' | 'info'} type
 * @param {string} title
 * @param {string} message
 * @param {function} onClose
 */
export default function Toast({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) {
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]} ${className}`} role="alert">
      <span className={styles.icon}>{renderIcon()}</span>
      <div className={styles.content}>
        {title && <h5 className={styles.title}>{title}</h5>}
        {message && <p className={styles.message}>{message}</p>}
      </div>
      {onClose && (
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}
