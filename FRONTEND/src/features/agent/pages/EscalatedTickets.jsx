import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEscalatedTickets } from '../services/agentTicket.service';
import styles from './EscalatedTickets.module.css';

export default function EscalatedTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEscalated = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEscalatedTickets({ limit: 100 });
      if (res && res.data) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load escalated tickets:', err);
      setError(err?.message || 'Failed to retrieve escalated tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscalated();
  }, [fetchEscalated]);

  const getReason = (t) => {
    if (t.sla?.isBreached || t.sla?.resolutionBreached) {
      return 'SLA Breach';
    }
    if (t.priority === 'URGENT') {
      return 'Critical Priority';
    }
    if (!t.assignedTo || t.agent === 'Unassigned') {
      return 'Awaiting Assignment';
    }
    return 'Engineering Escalation';
  };

  const [currentTime] = useState(() => Date.now());

  const getSlaText = (t, nowTs = currentTime) => {
    if (!t.sla) return { text: 'Standard SLA', isBreached: false, isRisk: false };
    if (t.sla.isBreached || t.sla.resolutionBreached) {
      return { text: 'SLA Breached', isBreached: true, isRisk: false };
    }
    if (t.sla.resolutionDeadline) {
      const remainingMs = new Date(t.sla.resolutionDeadline).getTime() - nowTs;
      if (remainingMs <= 0) {
        return { text: 'SLA Breached', isBreached: true, isRisk: false };
      }
      const mins = Math.round(remainingMs / (60 * 1000));
      if (mins <= 60) {
        return { text: `${mins}m left (At Risk)`, isBreached: false, isRisk: true };
      }
      const hrs = Math.round(mins / 60);
      return { text: `${hrs}h remaining`, isBreached: false, isRisk: false };
    }
    return { text: t.sla.policyName || 'Standard SLA', isBreached: false, isRisk: false };
  };

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const ticketId = (t.ticketNumber || t.id || t._id || '').toLowerCase();
      const subject = (t.subject || '').toLowerCase();
      const customer = (t.customer?.name || t.customer?.email || '').toLowerCase();
      const reason = getReason(t).toLowerCase();
      const details = (t.description || '').toLowerCase();

      return (
        ticketId.includes(q) ||
        subject.includes(q) ||
        customer.includes(q) ||
        reason.includes(q) ||
        details.includes(q)
      );
    });
  }, [tickets, searchQuery]);

  // Derived real KPI metrics
  const totalEscalated = tickets.length;
  const criticalCount = useMemo(() => {
    return tickets.filter((t) => t.priority === 'URGENT').length;
  }, [tickets]);

  const awaitingManagementCount = useMemo(() => {
    return tickets.filter((t) => !t.assignedTo || t.agent === 'Unassigned').length;
  }, [tickets]);

  const slaAtRiskBreachedCount = useMemo(() => {
    return tickets.filter((t) => {
      if (t.sla?.isBreached || t.sla?.resolutionBreached) return true;
      if (t.sla?.resolutionDeadline) {
        const remainingMs = new Date(t.sla.resolutionDeadline).getTime() - currentTime;
        return remainingMs <= 60 * 60 * 1000;
      }
      return false;
    }).length;
  }, [tickets, currentTime]);

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
          <span>{totalEscalated} Active Escalations</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon}>🔥</span>
            <span className={styles.statVal}>{totalEscalated}</span>
          </div>
          <span className={styles.statLabel}>Total Escalated</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#FF453A' }}>⚠️</span>
            <span className={styles.statVal} style={{ color: '#FF453A' }}>
              {criticalCount}
            </span>
          </div>
          <span className={styles.statLabel}>Critical Priority</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#FF9F0A' }}>⏳</span>
            <span className={styles.statVal} style={{ color: '#FF9F0A' }}>
              {awaitingManagementCount}
            </span>
          </div>
          <span className={styles.statLabel}>Awaiting Management</span>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statTop}>
            <span className={styles.statIcon} style={{ color: '#BF5AF2' }}>⏱</span>
            <span className={styles.statVal} style={{ color: '#BF5AF2' }}>
              {slaAtRiskBreachedCount}
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
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            <h3 className={styles.emptyTitle}>Loading Escalated Tickets...</h3>
            <p className={styles.emptyDesc}>Retrieving priority tickets from live backend.</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <h3 className={styles.emptyTitle}>Failed to Load Escalated Tickets</h3>
            <p className={styles.emptyDesc}>{error}</p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={fetchEscalated}
              style={{
                marginTop: '1rem',
                background: '#FF453A',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
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
                  {filtered.map((t) => {
                    const ticketIdStr = t.ticketNumber || t.id || t._id;
                    const customerName = t.customer?.name || t.customer?.email || 'Unknown';
                    const agentName = t.agent || t.assignedTo?.name || 'Unassigned';
                    const reason = getReason(t);
                    const slaInfo = getSlaText(t);

                    return (
                      <tr
                        key={t.id || t._id}
                        className={styles.tableRow}
                        onClick={() => navigate(`/agent/tickets/${ticketIdStr}`)}
                      >
                        <td className={styles.idCell}>{ticketIdStr}</td>
                        <td className={styles.subjectCell}>
                          <div className={styles.subjectGroup}>
                            <span className={styles.subjectText}>{t.subject}</span>
                            <span className={styles.detailsSnippet}>
                              {t.description ? t.description.slice(0, 90) : ''}
                            </span>
                          </div>
                        </td>
                        <td className={styles.customerCell}>{customerName}</td>
                        <td>
                          <span className={styles.priorityCritical}>{t.priority}</span>
                        </td>
                        <td>
                          <span className={styles.reasonBadge}>{reason}</span>
                        </td>
                        <td className={styles.agentCell}>{agentName}</td>
                        <td className={slaInfo.isBreached ? styles.slaBreached : styles.slaRisk}>
                          {slaInfo.text}
                        </td>
                        <td>
                          <span className={styles.actionLink}>Investigate →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className={styles.mobileList}>
              {filtered.map((t) => {
                const ticketIdStr = t.ticketNumber || t.id || t._id;
                const customerName = t.customer?.name || t.customer?.email || 'Unknown';
                const agentName = t.agent || t.assignedTo?.name || 'Unassigned';
                const reason = getReason(t);
                const slaInfo = getSlaText(t);

                return (
                  <div
                    key={t.id || t._id}
                    className={styles.mobileCard}
                    onClick={() => navigate(`/agent/tickets/${ticketIdStr}`)}
                  >
                    <div className={styles.mobileTop}>
                      <span className={styles.idCell}>{ticketIdStr}</span>
                      <span className={styles.priorityCritical}>{t.priority}</span>
                    </div>

                    <h4 className={styles.mobileSubject}>{t.subject}</h4>
                    <p className={styles.mobileReason}>⚠️ Reason: <strong>{reason}</strong></p>

                    <div className={styles.mobileMeta}>
                      <span>👤 {customerName}</span>
                      <span>👨‍💻 {agentName}</span>
                    </div>

                    <div className={styles.mobileFooter}>
                      <span className={slaInfo.isBreached ? styles.slaBreached : styles.slaRisk}>
                        ⏱ {slaInfo.text}
                      </span>
                      <span className={styles.actionLink}>Investigate →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
