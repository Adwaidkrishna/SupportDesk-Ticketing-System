import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { escalatedTicketsList } from '../agentMockData';
import styles from './EscalatedTickets.module.css';

export default function EscalatedTickets() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = escalatedTicketsList.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>HIGH PRIORITY MONITOR</span>
          <h1 className={styles.title}>Escalated Tickets</h1>
          <p className={styles.subtitle}>
            Tickets requiring engineering intervention, senior agent review, or higher-level privileges.
          </p>
        </div>

        <div className={styles.headerBadge}>
          <span className={styles.alertIcon}>🚨</span>
          <span>{escalatedTicketsList.length} Active Escalations</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon}>🔥</span>
            <span className={styles.statVal}>{escalatedTicketsList.length}</span>
          </div>
          <span className={styles.statLabel}>Total Escalated</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#FF453A' }}>⚠️</span>
            <span className={styles.statVal} style={{ color: '#FF453A' }}>
              {escalatedTicketsList.filter((t) => t.priority === 'Critical').length}
            </span>
          </div>
          <span className={styles.statLabel}>Critical Priority</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#FF9F0A' }}>⏳</span>
            <span className={styles.statVal} style={{ color: '#FF9F0A' }}>
              2
            </span>
          </div>
          <span className={styles.statLabel}>Awaiting Management</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#BF5AF2' }}>⏱</span>
            <span className={styles.statVal} style={{ color: '#BF5AF2' }}>
              {escalatedTicketsList.filter((t) => t.sla.includes('Breached') || t.sla.includes('Risk')).length}
            </span>
          </div>
          <span className={styles.statLabel}>SLA At Risk / Breached</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchCard}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search escalated tickets by ID, subject, customer, or escalation reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Escalated Tickets Table & Cards */}
      <div className={styles.listCard}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🛡️</div>
            <h3 className={styles.emptyTitle}>No escalated tickets found</h3>
            <p className={styles.emptyDesc}>All high-priority tickets are currently operating within standard SLA.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Escalation Reason</th>
                    <th>Assigned Agent</th>
                    <th>SLA Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className={styles.tableRow}
                      onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
                    >
                      <td className={styles.idCell}>{t.id}</td>
                      <td className={styles.subjectCell}>
                        <div className={styles.subjectGroup}>
                          <span className={styles.subjectText}>{t.subject}</span>
                          <span className={styles.detailsSnippet}>{t.details}</span>
                        </div>
                      </td>
                      <td className={styles.customerCell}>{t.customer}</td>
                      <td>
                        <span className={styles.priorityCritical}>{t.priority}</span>
                      </td>
                      <td>
                        <span className={styles.reasonBadge}>{t.reason}</span>
                      </td>
                      <td className={styles.agentCell}>{t.assignedAgent}</td>
                      <td className={t.sla.includes('Breached') ? styles.slaBreached : styles.slaRisk}>
                        {t.sla}
                      </td>
                      <td>
                        <span className={styles.actionLink}>Investigate →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className={styles.mobileList}>
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className={styles.mobileCard}
                  onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
                >
                  <div className={styles.mobileTop}>
                    <span className={styles.idCell}>{t.id}</span>
                    <span className={styles.priorityCritical}>{t.priority}</span>
                  </div>

                  <h4 className={styles.mobileSubject}>{t.subject}</h4>
                  <p className={styles.mobileReason}>⚠️ Reason: <strong>{t.reason}</strong></p>

                  <div className={styles.mobileMeta}>
                    <span>👤 {t.customer}</span>
                    <span>👨‍💻 {t.assignedAgent}</span>
                  </div>

                  <div className={styles.mobileFooter}>
                    <span className={t.sla.includes('Breached') ? styles.slaBreached : styles.slaRisk}>
                      ⏱ {t.sla}
                    </span>
                    <span className={styles.actionLink}>Investigate →</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
