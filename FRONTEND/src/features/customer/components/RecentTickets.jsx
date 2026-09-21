import { useNavigate } from 'react-router-dom';
import styles from './RecentTickets.module.css';

/**
 * Helper to normalize and format creation date
 */
function formatDate(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Status style mapping
 */
function getStatusBadge(status) {
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'OPEN':
      return { label: 'Open', className: styles.statusInfo };
    case 'IN_PROGRESS':
      return { label: 'In Progress', className: styles.statusWarning };
    case 'RESOLVED':
      return { label: 'Resolved', className: styles.statusSuccess };
    case 'CLOSED':
      return { label: 'Closed', className: styles.statusMuted };
    default:
      return { label: status || 'Unknown', className: styles.statusMuted };
  }
}

/**
 * Priority style mapping
 */
function getPriorityBadge(priority) {
  const normalized = (priority || '').toUpperCase();
  switch (normalized) {
    case 'URGENT':
      return { label: 'Urgent', className: styles.priorityUrgent };
    case 'HIGH':
      return { label: 'High', className: styles.priorityHigh };
    case 'MEDIUM':
      return { label: 'Medium', className: styles.priorityMedium };
    case 'LOW':
    default:
      return { label: 'Low', className: styles.priorityLow };
  }
}

export default function RecentTickets({ tickets = [], onViewAll, onCreateTicket }) {
  const navigate = useNavigate();

  const handleTicketClick = (ticket) => {
    const targetId = ticket.id || ticket._id || ticket.ticketNumber;
    if (targetId) {
      navigate(`/customer/tickets/${targetId}`);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>Recent Tickets</h3>
          {tickets.length > 0 && (
            <span className={styles.countBadge}>{tickets.length}</span>
          )}
        </div>
        {onViewAll && (
          <button type="button" className={styles.viewAllButton} onClick={onViewAll}>
            View all →
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No tickets found</p>
          <p className={styles.emptyDesc}>
            You have not submitted any support tickets yet.
          </p>
          {onCreateTicket && (
            <button
              type="button"
              className={styles.createFirstBtn}
              onClick={onCreateTicket}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create your first ticket</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className={styles.actionCol}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const statusInfo = getStatusBadge(t.status);
                  const priorityInfo = getPriorityBadge(t.priority);
                  const categoryName = t.category?.name || 'General';
                  const key = t.id || t._id || t.ticketNumber;

                  return (
                    <tr
                      key={key}
                      className={styles.clickableRow}
                      onClick={() => handleTicketClick(t)}
                    >
                      <td className={styles.idCell}>
                        {t.ticketNumber || `#${String(key).slice(-6)}`}
                      </td>
                      <td className={styles.subjectCell}>
                        <span className={styles.subjectText}>{t.subject}</span>
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>
                          <span className={styles.catDot} />
                          {categoryName}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.priorityBadge} ${priorityInfo.className}`}>
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className={styles.createdCell}>{formatDate(t.createdAt)}</td>
                      <td className={styles.actionCol}>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTicketClick(t);
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className={styles.mobileList}>
            {tickets.map((t) => {
              const statusInfo = getStatusBadge(t.status);
              const priorityInfo = getPriorityBadge(t.priority);
              const categoryName = t.category?.name || 'General';
              const key = t.id || t._id || t.ticketNumber;

              return (
                <div
                  key={key}
                  className={styles.mobileCard}
                  onClick={() => handleTicketClick(t)}
                >
                  <div className={styles.mobileCardTop}>
                    <span className={styles.idCell}>
                      {t.ticketNumber || `#${String(key).slice(-6)}`}
                    </span>
                    <div className={styles.mobileBadges}>
                      <span className={`${styles.priorityBadge} ${priorityInfo.className}`}>
                        {priorityInfo.label}
                      </span>
                      <span className={`${styles.statusPill} ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <h4 className={styles.mobileSubject}>{t.subject}</h4>
                  <div className={styles.mobileCardFooter}>
                    <span className={styles.categoryBadge}>
                      <span className={styles.catDot} />
                      {categoryName}
                    </span>
                    <span className={styles.createdCell}>{formatDate(t.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
