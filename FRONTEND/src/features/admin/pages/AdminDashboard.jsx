import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getAdminDashboard } from '../services/adminDashboard.service';
import styles from './AdminDashboard.module.css';

/**
 * Admin Dashboard page connected to live backend API:
 * GET /api/v1/dashboard/admin
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminDashboard();
      if (response?.success && response?.data) {
        setDashboardData(response.data);
      } else {
        setError('Received an unexpected response from the server.');
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
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
        const response = await getAdminDashboard();
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
          console.error('Failed to load admin dashboard:', err);
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

  const displayName = user?.name ? user.name.split(' ')[0] : 'Administrator';
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Extract backend data with safe fallbacks
  const userStats = dashboardData?.userStats || {
    total: 0,
    customers: 0,
    agents: 0,
    admins: 0,
  };

  const ticketStats = dashboardData?.ticketStats || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  const ticketsByPriority = dashboardData?.ticketsByPriority || {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  const ticketsByCategory = dashboardData?.ticketsByCategory || [];
  const agentWorkload = dashboardData?.agentWorkload || [];
  const recentActivity =
    dashboardData?.recentTicketActivity || dashboardData?.recentActivity || [];

  // Helper calculations
  const totalTickets = ticketStats.total || 0;
  const maxCategoryCount = Math.max(
    ...ticketsByCategory.map((c) => c.count || 0),
    1
  );

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
      case 'CRITICAL':
        return styles.critical;
      case 'HIGH':
        return styles.high;
      case 'MEDIUM':
        return styles.medium;
      case 'LOW':
      default:
        return styles.low;
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

  const renderKPIIcon = (type) => {
    switch (type) {
      case 'layers':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        );
      case 'folder-open':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
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
      id: 'kpi-total',
      label: 'Total Tickets',
      value: ticketStats.total,
      subtext: 'System-wide tickets',
      color: '#0A84FF',
      bgColor: 'rgba(10, 132, 255, 0.15)',
      icon: 'layers',
    },
    {
      id: 'kpi-open',
      label: 'Open',
      value: ticketStats.open,
      subtext: 'Awaiting action',
      color: '#FF9F0A',
      bgColor: 'rgba(255, 159, 10, 0.15)',
      icon: 'folder-open',
    },
    {
      id: 'kpi-inprogress',
      label: 'In Progress',
      value: ticketStats.inProgress,
      subtext: 'Actively handled',
      color: '#64D2FF',
      bgColor: 'rgba(100, 210, 255, 0.15)',
      icon: 'clock',
    },
    {
      id: 'kpi-resolved',
      label: 'Resolved',
      value: ticketStats.resolved,
      subtext: 'Awaiting customer close',
      color: '#30D158',
      bgColor: 'rgba(48, 209, 88, 0.15)',
      icon: 'check-circle',
    },
    {
      id: 'kpi-closed',
      label: 'Closed',
      value: ticketStats.closed,
      subtext: 'Archived tickets',
      color: '#8E8E93',
      bgColor: 'rgba(142, 142, 147, 0.15)',
      icon: 'archive',
    },
  ];

  const priorityCards = [
    {
      priority: 'URGENT',
      count: ticketsByPriority.URGENT || 0,
      color: '#FF453A',
    },
    {
      priority: 'HIGH',
      count: ticketsByPriority.HIGH || 0,
      color: '#FF9F0A',
    },
    {
      priority: 'MEDIUM',
      count: ticketsByPriority.MEDIUM || 0,
      color: '#0A84FF',
    },
    {
      priority: 'LOW',
      count: ticketsByPriority.LOW || 0,
      color: '#30D158',
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>SYSTEM OPERATIONS</span>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome, {displayName}! Here is the system-wide overview of your support operation.
          </p>
        </div>

        <div className={styles.headerMeta}>
          <div className={styles.dateChip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{currentDate}</span>
          </div>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => navigate('/admin/tickets')}
          >
            Manage All Tickets →
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading admin dashboard metrics...</p>
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
          {/* Ticket Statistics (5 KPI Cards) */}
          <div className={styles.kpiGrid}>
            {kpiCards.map((kpi) => (
              <div key={kpi.id} className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>{kpi.label}</span>
                  <div
                    className={styles.kpiIcon}
                    style={{ background: kpi.bgColor, color: kpi.color }}
                  >
                    {renderKPIIcon(kpi.icon)}
                  </div>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{kpi.value}</span>
                  <span className={styles.kpiChange}>{kpi.subtext}</span>
                </div>
              </div>
            ))}
          </div>

          {/* User Statistics (4 Summary Pills) */}
          <div className={styles.systemSummaryRow}>
            <div className={styles.systemPill}>
              <span className={styles.pillValue}>{userStats.total}</span>
              <span className={styles.pillLabel}>Total Users</span>
            </div>
            <div className={styles.systemPill}>
              <span className={styles.pillValue}>
                {userStats.customers ?? userStats.customer ?? 0}
              </span>
              <span className={styles.pillLabel}>Customers</span>
            </div>
            <div className={styles.systemPill}>
              <span className={styles.pillValue}>
                {userStats.agents ?? userStats.agent ?? 0}
              </span>
              <span className={styles.pillLabel}>Support Agents</span>
            </div>
            <div className={styles.systemPill}>
              <span className={styles.pillValue}>
                {userStats.admins ?? userStats.admin ?? 0}
              </span>
              <span className={styles.pillLabel}>Administrators</span>
            </div>
          </div>

          {/* Priority Breakdown & Categories Distribution */}
          <div className={styles.gridTwoCols}>
            {/* Priority Distribution */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Tickets by Priority</h3>
              <p className={styles.cardDesc}>Ticket distribution across severity levels.</p>

              <div className={styles.priorityGrid}>
                {priorityCards.map((p) => {
                  const percentage =
                    totalTickets > 0
                      ? ((p.count / totalTickets) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={p.priority} className={styles.priorityCard}>
                      <div className={styles.priorityTop}>
                        <span
                          className={styles.priorityDot}
                          style={{ background: p.color }}
                        />
                        <span className={styles.priorityName}>{p.priority}</span>
                      </div>
                      <div className={styles.priorityValue}>{p.count}</div>
                      <span className={styles.prioritySub}>
                        {percentage}% of tickets
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tickets by Category */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>Tickets by Category</h3>
                  <p className={styles.cardDesc}>Distribution across active categories.</p>
                </div>
                <button
                  type="button"
                  className={styles.textLinkBtn}
                  onClick={() => navigate('/admin/categories')}
                >
                  Manage →
                </button>
              </div>

              {ticketsByCategory.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📁</span>
                  <p className={styles.emptyText}>No category data available.</p>
                </div>
              ) : (
                <div className={styles.categoryList}>
                  {ticketsByCategory.map((cat) => {
                    const percentage =
                      totalTickets > 0
                        ? ((cat.count / totalTickets) * 100).toFixed(1)
                        : '0';
                    const fillWidth = Math.round(
                      (cat.count / maxCategoryCount) * 100
                    );
                    return (
                      <div key={cat.categoryId || cat.name} className={styles.categoryItem}>
                        <div className={styles.categoryMeta}>
                          <span className={styles.categoryName}>{cat.name}</span>
                          <span className={styles.categoryCount}>
                            {cat.count} ({percentage}%)
                          </span>
                        </div>
                        <div className={styles.categoryBarTrack}>
                          <div
                            className={styles.categoryBarFill}
                            style={{ width: `${fillWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Agent Workload Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Agent Workload</h3>
                <p className={styles.cardDesc}>Active and completed workload per support agent.</p>
              </div>
              <button
                type="button"
                className={styles.textLinkBtn}
                onClick={() => navigate('/admin/agents')}
              >
                Manage Team →
              </button>
            </div>

            {agentWorkload.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👥</span>
                <p className={styles.emptyText}>No registered agents found.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Active Tickets</th>
                      <th>Resolved Tickets</th>
                      <th>Closed Tickets</th>
                      <th>Total Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentWorkload.map((agent) => {
                      const initials = agent.name
                        ? agent.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : 'AG';
                      return (
                        <tr key={agent.agentId || agent.email}>
                          <td>
                            <div className={styles.agentCell}>
                              <span className={styles.agentAvatar}>{initials}</span>
                              <div>
                                <strong className={styles.agentName}>{agent.name}</strong>
                                <span className={styles.agentEmail}>{agent.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: '#64D2FF' }}>
                              {agent.active ?? 0}
                            </strong>
                          </td>
                          <td>
                            <span style={{ color: '#30D158' }}>
                              {agent.resolved ?? 0}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#8E8E93' }}>
                              {agent.closed ?? 0}
                            </span>
                          </td>
                          <td>
                            <strong className={styles.slaValue}>
                              {agent.totalAssigned ?? 0}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Ticket Activity */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Recent Ticket Activity</h3>
                <p className={styles.cardDesc}>Latest system-wide tickets across all channels.</p>
              </div>
              <button
                type="button"
                className={styles.textLinkBtn}
                onClick={() => navigate('/admin/tickets')}
              >
                View All Tickets →
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎫</span>
                <p className={styles.emptyText}>No recent ticket activity found.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject</th>
                      <th>Customer</th>
                      <th>Assigned Agent</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((t) => (
                      <tr
                        key={t._id || t.id}
                        className={styles.clickableRow}
                        onClick={() => navigate(`/admin/tickets/${t._id || t.id}`)}
                      >
                        <td>
                          <span className={styles.ticketId}>
                            {t.ticketNumber || `#${(t._id || t.id).slice(-6)}`}
                          </span>
                        </td>
                        <td>
                          <span className={styles.ticketSubject}>{t.subject}</span>
                        </td>
                        <td>{t.customer?.name || 'Customer'}</td>
                        <td>
                          {t.assignedTo?.name ? (
                            t.assignedTo.name
                          ) : (
                            <span className={styles.unassignedText}>Unassigned</span>
                          )}
                        </td>
                        <td>{t.category?.name || 'General'}</td>
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
                          <span className={styles.statusPill}>{t.status}</span>
                        </td>
                        <td>
                          <span className={styles.timeText}>
                            {formatTicketDate(t.createdAt || t.updatedAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Operations Shortcuts */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Quick Operations</h3>
            <p className={styles.cardDesc}>Direct shortcuts to administrative sections.</p>

            <div className={styles.quickActionsGrid}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/tickets')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <span>Manage Tickets</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/users')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span>Manage Users</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/agents')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
                <span>Manage Agents</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/categories')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Categories</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/sla')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>SLA Management</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/reports')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
                <span>View Reports</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/settings')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>System Settings</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
