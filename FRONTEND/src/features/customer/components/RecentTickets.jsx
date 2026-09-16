import styles from './RecentTickets.module.css';

export default function RecentTickets({ tickets, onViewAll }) {
  const getStatusClass = (variant) => {
    switch (variant) {
      case 'info':
        return styles.statusInfo;
      case 'warning':
        return styles.statusWarning;
      case 'success':
        return styles.statusSuccess;
      case 'muted':
      default:
        return styles.statusMuted;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Tickets</h3>
        <button type="button" className={styles.viewAllButton} onClick={onViewAll}>
          View all →
        </button>
      </div>

      {/* Desktop Table View */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th className={styles.actionCol}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className={styles.idCell}>{t.id}</td>
                <td className={styles.subjectCell}>{t.subject}</td>
                <td>
                  <span className={styles.categoryBadge}>
                    <span className={styles.catDot} style={{ backgroundColor: t.categoryColor }} />
                    {t.category}
                  </span>
                </td>
                <td>
                  <span className={`${styles.statusPill} ${getStatusClass(t.statusVariant)}`}>
                    {t.status}
                  </span>
                </td>
                <td className={styles.createdCell}>{t.created}</td>
                <td className={styles.actionCol}>
                  <button type="button" className={styles.actionButton} title="Options">
                    •••
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className={styles.mobileList}>
        {tickets.map((t) => (
          <div key={t.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.idCell}>{t.id}</span>
              <span className={`${styles.statusPill} ${getStatusClass(t.statusVariant)}`}>
                {t.status}
              </span>
            </div>
            <h4 className={styles.mobileSubject}>{t.subject}</h4>
            <div className={styles.mobileCardFooter}>
              <span className={styles.categoryBadge}>
                <span className={styles.catDot} style={{ backgroundColor: t.categoryColor }} />
                {t.category}
              </span>
              <span className={styles.createdCell}>{t.created}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
