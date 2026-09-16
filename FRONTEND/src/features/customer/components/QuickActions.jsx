import { useNavigate } from 'react-router-dom';
import styles from './QuickActions.module.css';

export default function QuickActions({ actions }) {
  const navigate = useNavigate();

  const renderIcon = (type) => {
    switch (type) {
      case 'plus-circle':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
      case 'book-open':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        );
      case 'message-square':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Quick Actions</h3>

      <div className={styles.list}>
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className={styles.actionItem}
            onClick={() => navigate(act.route)}
          >
            <div className={styles.iconBox} style={{ color: act.color, backgroundColor: `${act.color}18` }}>
              {renderIcon(act.icon)}
            </div>
            <div className={styles.info}>
              <h4 className={styles.actionTitle}>{act.title}</h4>
              <p className={styles.actionDesc}>{act.description}</p>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
