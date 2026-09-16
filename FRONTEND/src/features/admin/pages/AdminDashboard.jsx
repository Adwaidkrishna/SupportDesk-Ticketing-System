import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentAdmin,
  adminDashboardKPIs,
  adminSystemStats,
  adminTicketActivityData,
  adminStatusDistribution,
  adminPriorityDistribution,
  adminSlaOverviewStats,
  adminAgentOperationalOverview,
  adminRecentTickets,
} from '../adminMockData';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activityTimeframe, setActivityTimeframe] = useState('7d');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const chartData = adminTicketActivityData[activityTimeframe];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>SYSTEM OPERATIONS</span>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Good morning, {currentAdmin.name}! Here's what's happening across your support operation.
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

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {adminDashboardKPIs.map((kpi) => (
          <div key={kpi.id} className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <div className={styles.kpiIcon} style={{ background: kpi.bgColor, color: kpi.color }}>
                {renderKPIIcon(kpi.icon)}
              </div>
            </div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span
                className={`${styles.kpiChange} ${
                  kpi.trend === 'up' ? styles.upTrend : kpi.trend === 'down' ? styles.downTrend : ''
                }`}
              >
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick System Summary Pills */}
      <div className={styles.systemSummaryRow}>
        <div className={styles.systemPill}>
          <span className={styles.pillValue}>{adminSystemStats.activeCustomers}</span>
          <span className={styles.pillLabel}>Active Customers</span>
        </div>
        <div className={styles.systemPill}>
          <span className={styles.pillValue}>{adminSystemStats.activeAgents}</span>
          <span className={styles.pillLabel}>Active Support Agents</span>
        </div>
        <div className={styles.systemPill}>
          <span className={styles.pillValue}>{adminSystemStats.totalCategories}</span>
          <span className={styles.pillLabel}>Ticket Categories</span>
        </div>
        <div className={styles.systemPill}>
          <span className={styles.pillValue}>{adminSystemStats.activeSLAPolicies}</span>
          <span className={styles.pillLabel}>SLA Policies Active</span>
        </div>
      </div>

      {/* Main Grid: Ticket Activity Chart & SLA Overview */}
      <div className={styles.gridTwoCols}>
        {/* Ticket Activity Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>System-Wide Ticket Activity</h3>
              <p className={styles.cardDesc}>Compare total ticket volume created vs resolved over time.</p>
            </div>
            <div className={styles.timeframeTabs}>
              <button
                type="button"
                className={`${styles.tfBtn} ${activityTimeframe === '7d' ? styles.activeTf : ''}`}
                onClick={() => setActivityTimeframe('7d')}
              >
                7 Days
              </button>
              <button
                type="button"
                className={`${styles.tfBtn} ${activityTimeframe === '30d' ? styles.activeTf : ''}`}
                onClick={() => setActivityTimeframe('30d')}
              >
                30 Days
              </button>
              <button
                type="button"
                className={`${styles.tfBtn} ${activityTimeframe === '90d' ? styles.activeTf : ''}`}
                onClick={() => setActivityTimeframe('90d')}
              >
                90 Days
              </button>
            </div>
          </div>

          <div className={styles.chartLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#0A84FF' }} /> Created Tickets
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#30D158' }} /> Resolved Tickets
            </span>
          </div>

          {/* Lightweight CSS Bar Chart */}
          <div className={styles.barChartContainer}>
            {chartData.days.map((day, idx) => {
              const cVal = chartData.created[idx];
              const rVal = chartData.resolved[idx];
              const maxVal = Math.max(...chartData.created, ...chartData.resolved, 100);
              const cHeight = Math.round((cVal / maxVal) * 100);
              const rHeight = Math.round((rVal / maxVal) * 100);

              return (
                <div key={day} className={styles.barGroup}>
                  <div className={styles.barsPair}>
                    <div
                      className={styles.barCreated}
                      style={{ height: `${cHeight}%` }}
                      title={`Created: ${cVal}`}
                    />
                    <div
                      className={styles.barResolved}
                      style={{ height: `${rHeight}%` }}
                      title={`Resolved: ${rVal}`}
                    />
                  </div>
                  <span className={styles.barDayLabel}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA & Status Overview Column */}
        <div className={styles.sideColumn}>
          {/* SLA Compliance Box */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>SLA Compliance</h3>
            <p className={styles.cardDesc}>Response & resolution targets status.</p>

            <div className={styles.slaMeterRow}>
              <div className={styles.slaRingContainer}>
                <div className={styles.ringValue}>98.0%</div>
                <div className={styles.ringLabel}>SLA Compliance</div>
              </div>
              <div className={styles.slaBreakdown}>
                <div className={styles.slaMetric}>
                  <span className={styles.slaDot} style={{ background: '#30D158' }} />
                  <span className={styles.slaMetricLabel}>Within SLA:</span>
                  <strong className={styles.slaMetricVal}>{adminSlaOverviewStats.withinSLA}</strong>
                </div>
                <div className={styles.slaMetric}>
                  <span className={styles.slaDot} style={{ background: '#FF9F0A' }} />
                  <span className={styles.slaMetricLabel}>At Risk:</span>
                  <strong className={styles.slaMetricVal}>{adminSlaOverviewStats.atRisk}</strong>
                </div>
                <div className={styles.slaMetric}>
                  <span className={styles.slaDot} style={{ background: '#FF453A' }} />
                  <span className={styles.slaMetricLabel}>Breached:</span>
                  <strong className={styles.slaMetricVal}>{adminSlaOverviewStats.breached}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Status Distribution */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Status Distribution</h3>
            <div className={styles.distList}>
              {adminStatusDistribution.map((item) => (
                <div key={item.status} className={styles.distItem}>
                  <div className={styles.distMeta}>
                    <span className={styles.distName}>{item.status}</span>
                    <span className={styles.distCount}>{item.count} tickets ({item.percentage})</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: item.percentage, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Priority Distribution & Quick Actions */}
      <div className={styles.gridTwoCols}>
        {/* Priority Breakdown */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Priority Distribution</h3>
          <p className={styles.cardDesc}>Ticket volume by severity across all categories.</p>

          <div className={styles.priorityGrid}>
            {adminPriorityDistribution.map((p) => (
              <div key={p.priority} className={styles.priorityCard}>
                <div className={styles.priorityTop}>
                  <span className={styles.priorityDot} style={{ background: p.color }} />
                  <span className={styles.priorityName}>{p.priority}</span>
                </div>
                <div className={styles.priorityValue}>{p.count}</div>
                <span className={styles.prioritySub}>{p.percentage} of active tickets</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations Shortcuts */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Quick Operations</h3>
          <p className={styles.cardDesc}>Direct administrative shortcuts.</p>

          <div className={styles.quickActionsGrid}>
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
      </div>

      {/* Agent Operational Workload Table (No ranking/leaderboards) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Agent Operational Status</h3>
            <p className={styles.cardDesc}>System-wide agent queue load and SLA metrics.</p>
          </div>
          <button
            type="button"
            className={styles.textLinkBtn}
            onClick={() => navigate('/admin/agents')}
          >
            Manage Team →
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>In Progress</th>
                <th>Resolved Today</th>
                <th>Pending</th>
                <th>SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              {adminAgentOperationalOverview.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <div className={styles.agentCell}>
                      <span className={styles.agentAvatar}>{agent.agent.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong className={styles.agentName}>{agent.agent}</strong>
                        <span className={styles.agentEmail}>{agent.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[agent.status.toLowerCase()]}`}>
                      ● {agent.status}
                    </span>
                  </td>
                  <td>{agent.assigned}</td>
                  <td>{agent.inProgress}</td>
                  <td>{agent.resolved}</td>
                  <td>{agent.pending}</td>
                  <td>
                    <strong className={styles.slaValue}>{agent.sla}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Recent Ticket Activity</h3>
            <p className={styles.cardDesc}>Latest system-wide tickets across all teams.</p>
          </div>
          <button
            type="button"
            className={styles.textLinkBtn}
            onClick={() => navigate('/admin/tickets')}
          >
            View All Tickets →
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Assigned Agent</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {adminRecentTickets.map((t) => (
                <tr
                  key={t.id}
                  className={styles.clickableRow}
                  onClick={() => navigate(`/admin/tickets/${t.id.replace('#', '')}`)}
                >
                  <td>
                    <span className={styles.ticketId}>{t.id}</span>
                  </td>
                  <td>
                    <span className={styles.ticketSubject}>{t.subject}</span>
                  </td>
                  <td>{t.customer}</td>
                  <td>{t.agent}</td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[t.priority.toLowerCase()]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusPill}>{t.status}</span>
                  </td>
                  <td>
                    <span className={styles.slaText}>{t.sla}</span>
                  </td>
                  <td>
                    <span className={styles.timeText}>{t.updated}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderKPIIcon(type) {
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
    case 'alert-triangle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'x-circle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
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
}
