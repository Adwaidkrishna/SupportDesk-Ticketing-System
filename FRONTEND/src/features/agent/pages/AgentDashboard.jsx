import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getAgentDashboard } from '../services/agentDashboard.service';
import styles from './AgentDashboard.module.css';

/**
 * Agent Dashboard connected to live backend API:
 * GET /api/v1/dashboard/agent
 */
export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAgentDashboard();
      if (response?.success && response?.data) {
        setDashboardData(response.data);
      } else {
        setError('Received an unexpected response from the server.');
      }
    } catch (err) {
      console.error('Failed to load agent dashboard:', err);
      setError(
        err.message || 'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard data on mount and whenever authenticated user identity changes
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setError('');
        const response = await getAgentDashboard();
        if (isMounted) {
          if (response?.success && response?.data) {
            setDashboardData(response.data);
          } else {
            setError('Received an unexpected response from the server.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load agent dashboard:', err);
          setError(
            err.message || 'Unable to connect to the server. Please check your connection and try again.'
          );
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?._id]);

  const displayName = user?.name ? user.name.split(' ')[0] : 'Agent';
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const stats = dashboardData?.stats || {
    availableTickets: 0,
    myActiveTickets: 0,
    myHighUrgentTickets: 0,
    myResolvedTickets: 0,
    myClosedTickets: 0,
  };

  const workload = dashboardData?.workload || {
    totalAssigned: 0,
    activeTickets: 0,
    highUrgentTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
  };

  const recentAssignedTickets = dashboardData?.recentAssignedTickets || [];

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
      case 'CRITICAL':
        return styles.priorityCritical;
      case 'HIGH':
        return styles.priorityHigh;
      case 'MEDIUM':
        return styles.priorityMedium;
      case 'LOW':
      default:
        return styles.priorityLow;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return styles.statusOpen;
      case 'IN_PROGRESS':
        return styles.statusInfo;
      case 'RESOLVED':
        return styles.statusOpen;
      case 'CLOSED':
      default:
        return styles.statusMuted;
    }
  };

  const formatTicketDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderKPIIcon = (icon) => {
    switch (icon) {
      case 'inbox':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        );
      case 'user-check':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'alert-triangle':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'archive':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        );
      case 'check-circle':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
    }
  };

  const kpiCards = [
    {
      id: 'stat-available',
      label: 'Available Tickets',
      value: stats.availableTickets,
      subtext: 'In queue to claim',
      color: '#0A84FF',
      bgColor: 'rgba(10, 132, 255, 0.12)',
      icon: 'inbox',
    },
    {
      id: 'stat-active',
      label: 'My Active Tickets',
      value: stats.myActiveTickets,
      subtext: 'Open & in progress',
      color: '#64D2FF',
      bgColor: 'rgba(100, 210, 255, 0.12)',
      icon: 'user-check',
    },
    {
      id: 'stat-high-urgent',
      label: 'High / Urgent',
      value: stats.myHighUrgentTickets,
      subtext: 'Active priority',
      color: '#FF453A',
      bgColor: 'rgba(255, 69, 58, 0.12)',
      icon: 'alert-triangle',
    },
    {
      id: 'stat-resolved',
      label: 'My Resolved',
      value: stats.myResolvedTickets,
      subtext: 'Completed tickets',
      color: '#30D158',
      bgColor: 'rgba(48, 209, 88, 0.12)',
      icon: 'check-circle',
    },
    {
      id: 'stat-closed',
      label: 'My Closed',
      value: stats.myClosedTickets,
      subtext: 'Closed tickets',
      color: '#8E8E93',
      bgColor: 'rgba(142, 142, 147, 0.12)',
      icon: 'archive',
    },
  ];

  // Workload bar helper
  const maxWorkload = Math.max(workload.totalAssigned, 1);

  return (
    <div className={styles.page}>
      {/* Header Banner */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.badgeLabel}>AGENT WORKSPACE</span>
          <h1 className={styles.title}>Welcome back, {displayName}!</h1>
          <p className={styles.subtitle}>Here is your live ticket overview and queue metrics.</p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.dateBadge}>
            <span className={styles.dateIcon}>📅</span>
            <span>{currentDateFormatted}</span>
          </div>

          <button
            type="button"
            className={styles.queueBtn}
            onClick={() => navigate('/agent/queue')}
          >
            Go to Available Queue →
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading agent dashboard metrics...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className={styles.errorTitle}>Failed to load dashboard</h3>
          <p className={styles.errorDesc}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={fetchDashboard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid (5 Cards) */}
          <div className={styles.kpiGrid}>
            {kpiCards.map((kpi) => (
              <div key={kpi.id} className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <div
                    className={styles.kpiIconWrap}
                    style={{ backgroundColor: kpi.bgColor, color: kpi.color }}
                  >
                    {renderKPIIcon(kpi.icon)}
                  </div>
                  <span className={styles.kpiChange} style={{ color: kpi.color }}>
                    {kpi.subtext}
                  </span>
                </div>
                <div className={styles.kpiVal}>{kpi.value}</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Main Grid: Recent Assigned Tickets (2fr) + Workload & Quick Actions (1fr) */}
          <div className={styles.mainGrid}>
            {/* Left Column: Recent Assigned Tickets */}
            <div className={styles.queueCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Recent Assigned Tickets</h2>
                  <p className={styles.cardSub}>Recently updated tickets assigned directly to you</p>
                </div>
                <button
                  type="button"
                  className={styles.viewAllBtn}
                  onClick={() => navigate('/agent/my-tickets')}
                >
                  View all ({workload.totalAssigned}) →
                </button>
              </div>

              {recentAssignedTickets.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📂</span>
                  <h4 className={styles.emptyTitle}>No Assigned Tickets</h4>
                  <p className={styles.emptyDesc}>
                    You currently have no tickets assigned to you. Claim tickets from the available queue to get started.
                  </p>
                  <button
                    type="button"
                    className={styles.browseQueueBtn}
                    onClick={() => navigate('/agent/queue')}
                  >
                    Browse Available Queue →
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Ticket</th>
                          <th>Subject</th>
                          <th>Customer</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAssignedTickets.map((t) => (
                          <tr
                            key={t._id || t.id}
                            className={styles.tableRow}
                            onClick={() => navigate(`/agent/tickets/${t._id || t.id}`)}
                          >
                            <td className={styles.ticketIdCell}>
                              {t.ticketNumber || `#${(t._id || t.id).slice(-6)}`}
                            </td>
                            <td className={styles.subjectCell}>{t.subject}</td>
                            <td className={styles.customerCell}>
                              {t.customer?.name || t.customerEmail || 'Customer'}
                            </td>
                            <td className={styles.customerCell}>
                              {t.category?.name || 'General'}
                            </td>
                            <td>
                              <span
                                className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                                  t.priority
                                )}`}
                              >
                                {t.priority}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${getStatusBadgeClass(
                                  t.status
                                )}`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className={styles.timeCell}>
                              {formatTicketDate(t.updatedAt || t.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List */}
                  <div className={styles.mobileQueueList}>
                    {recentAssignedTickets.map((t) => (
                      <div
                        key={t._id || t.id}
                        className={styles.mobileQueueCard}
                        onClick={() => navigate(`/agent/tickets/${t._id || t.id}`)}
                      >
                        <div className={styles.mobileQueueTop}>
                          <span className={styles.ticketIdCell}>
                            {t.ticketNumber || `#${(t._id || t.id).slice(-6)}`}
                          </span>
                          <span
                            className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <h4 className={styles.mobileSubject}>{t.subject}</h4>
                        <div className={styles.mobileMetaRow}>
                          <span>👤 {t.customer?.name || 'Customer'}</span>
                          <span
                            className={`${styles.statusBadge} ${getStatusBadgeClass(
                              t.status
                            )}`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Workload & Quick Actions */}
            <div className={styles.rightCol}>
              {/* Workload Card */}
              <div className={styles.workloadCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Workload Breakdown</h3>
                    <p className={styles.cardSub}>Active and completed ticket distribution</p>
                  </div>
                </div>

                <div className={styles.workloadList}>
                  <div className={styles.workloadItem}>
                    <div className={styles.workloadRow}>
                      <span className={styles.workloadLabel}>
                        <span style={{ color: '#0A84FF' }}>●</span> Total Assigned
                      </span>
                      <span className={styles.workloadVal}>{workload.totalAssigned}</span>
                    </div>
                    <div className={styles.workloadBarTrack}>
                      <div
                        className={styles.workloadBarFill}
                        style={{
                          width: `${workload.totalAssigned > 0 ? 100 : 0}%`,
                          backgroundColor: '#0A84FF',
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.workloadItem}>
                    <div className={styles.workloadRow}>
                      <span className={styles.workloadLabel}>
                        <span style={{ color: '#64D2FF' }}>●</span> Active Tickets
                      </span>
                      <span className={styles.workloadVal}>{workload.activeTickets}</span>
                    </div>
                    <div className={styles.workloadBarTrack}>
                      <div
                        className={styles.workloadBarFill}
                        style={{
                          width: `${(workload.activeTickets / maxWorkload) * 100}%`,
                          backgroundColor: '#64D2FF',
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.workloadItem}>
                    <div className={styles.workloadRow}>
                      <span className={styles.workloadLabel}>
                        <span style={{ color: '#FF453A' }}>●</span> High / Urgent Active
                      </span>
                      <span className={styles.workloadVal}>{workload.highUrgentTickets}</span>
                    </div>
                    <div className={styles.workloadBarTrack}>
                      <div
                        className={styles.workloadBarFill}
                        style={{
                          width: `${(workload.highUrgentTickets / maxWorkload) * 100}%`,
                          backgroundColor: '#FF453A',
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.workloadItem}>
                    <div className={styles.workloadRow}>
                      <span className={styles.workloadLabel}>
                        <span style={{ color: '#30D158' }}>●</span> Resolved
                      </span>
                      <span className={styles.workloadVal}>{workload.resolvedTickets}</span>
                    </div>
                    <div className={styles.workloadBarTrack}>
                      <div
                        className={styles.workloadBarFill}
                        style={{
                          width: `${(workload.resolvedTickets / maxWorkload) * 100}%`,
                          backgroundColor: '#30D158',
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.workloadItem}>
                    <div className={styles.workloadRow}>
                      <span className={styles.workloadLabel}>
                        <span style={{ color: '#8E8E93' }}>●</span> Closed
                      </span>
                      <span className={styles.workloadVal}>{workload.closedTickets}</span>
                    </div>
                    <div className={styles.workloadBarTrack}>
                      <div
                        className={styles.workloadBarFill}
                        style={{
                          width: `${(workload.closedTickets / maxWorkload) * 100}%`,
                          backgroundColor: '#8E8E93',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className={styles.quickActionsCard}>
                <h3 className={styles.cardTitle}>Quick Actions</h3>
                <div className={styles.quickGrid}>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/agent/queue')}
                  >
                    <span>📥 Available Queue</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/agent/my-tickets')}
                  >
                    <span>📂 My Assigned</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/agent/escalated')}
                  >
                    <span>🚨 Escalated Tickets</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/agent/tickets')}
                  >
                    <span>🔍 All Tickets</span>
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    onClick={() => navigate('/agent/notifications')}
                  >
                    <span>🔔 Notifications</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
