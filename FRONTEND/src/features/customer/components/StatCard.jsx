import styles from './StatCard.module.css';

export default function StatCard({ stat }) {
  const { label, value, change, trend, statusColor, bgColor, icon, sparkline } = stat;

  const renderIcon = () => {
    switch (icon) {
      case 'document':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'check':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'hourglass':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 22h14" />
            <path d="M5 2h14" />
            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
          </svg>
        );
      case 'archive':
      case 'closed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const maxSpark = Math.max(...(sparkline || [10]));

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.iconBox} style={{ backgroundColor: bgColor, color: statusColor }}>
          {renderIcon()}
        </div>

        {/* Mini Sparkline Bar Chart */}
        {sparkline && (
          <div className={styles.sparkline}>
            {sparkline.map((val, idx) => {
              const heightPct = Math.max(20, Math.round((val / maxSpark) * 100));
              const isLastTwo = idx >= sparkline.length - 2;
              return (
                <div
                  key={idx}
                  className={`${styles.sparkBar} ${isLastTwo ? styles.activeBar : ''}`}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: isLastTwo ? statusColor : 'rgba(255, 255, 255, 0.12)',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {change ? (
            <span
              className={`${styles.trendTag} ${trend === 'down' ? styles.trendDown : styles.trendUp}`}
            >
              {change}
            </span>
          ) : null}
        </div>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
