import { useState } from 'react';
import {
  adminReportsSummary,
  adminTicketActivityData,
  adminAgentOperationalOverview,
} from '../adminMockData';
import styles from './Reports.module.css';

export default function Reports() {
  const [timeframe, setTimeframe] = useState('30d');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleExport = () => {
    showToast('Report export will be available when the reporting API is connected.');
  };

  const chartData = adminTicketActivityData[timeframe] || adminTicketActivityData['30d'];

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toastMsg && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>BUSINESS INTELLIGENCE</span>
          <h1 className={styles.title}>Reports & Analytics</h1>
          <p className={styles.subtitle}>
            Comprehensive performance indicators, category distribution, SLA metrics, and operational workload.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.timeframeTabs}>
            <button
              type="button"
              className={`${styles.tfBtn} ${timeframe === '7d' ? styles.activeTf : ''}`}
              onClick={() => setTimeframe('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`${styles.tfBtn} ${timeframe === '30d' ? styles.activeTf : ''}`}
              onClick={() => setTimeframe('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`${styles.tfBtn} ${timeframe === '90d' ? styles.activeTf : ''}`}
              onClick={() => setTimeframe('90d')}
            >
              90 Days
            </button>
          </div>

          <button type="button" className={styles.exportBtn} onClick={handleExport}>
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Resolution Analytics KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg Resolution Time</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{adminReportsSummary.avgResolutionTime}</span>
            <span className={styles.kpiSub}>-15m vs last month</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg First Response</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {adminReportsSummary.avgFirstResponse}
            </span>
            <span className={styles.kpiSub}>Target: &lt; 30 min</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Resolution Rate</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#0A84FF' }}>
              {adminReportsSummary.resolutionRate}
            </span>
            <span className={styles.kpiSub}>+1.4% improvement</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Reopen Rate</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>
              {adminReportsSummary.reopenRate}
            </span>
            <span className={styles.kpiSub}>Target: &lt; 3.0%</span>
          </div>
        </div>
      </div>

      {/* Main Ticket Volume Trend Chart */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Ticket Volume Trends</h3>
            <p className={styles.cardDesc}>Ticket intake vs resolution throughput for selected timeframe.</p>
          </div>

          <div className={styles.chartLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#0A84FF' }} /> Created
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#30D158' }} /> Resolved
            </span>
          </div>
        </div>

        {/* Lightweight Visual Bar Chart */}
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

      {/* 2-Column Grid: Category Analytics & SLA Compliance Breakdown */}
      <div className={styles.grid2}>
        {/* Category Breakdown */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Volume by Category</h3>
          <p className={styles.cardDesc}>Proportion of tickets submitted across primary taxonomies.</p>

          <div className={styles.categoryList}>
            {adminReportsSummary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className={styles.catRow}>
                <div className={styles.catMeta}>
                  <span className={styles.catName}>{cat.category}</span>
                  <span className={styles.catVal}>{cat.count} tickets ({cat.percent}%)</span>
                </div>
                <div className={styles.barBg}>
                  <div className={styles.barFill} style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Compliance Breakdown */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>SLA Performance Overview</h3>
          <p className={styles.cardDesc}>Compliance adherence against Service Level Agreement targets.</p>

          <div className={styles.slaStatsContainer}>
            <div className={styles.slaLargeBox}>
              <div className={styles.slaPercent}>98.0%</div>
              <div className={styles.slaTag}>Overall SLA Compliance</div>
            </div>

            <div className={styles.slaDetailsList}>
              <div className={styles.slaDetailItem}>
                <span className={styles.slaStatusDot} style={{ background: '#30D158' }} />
                <span className={styles.slaDetailLabel}>Within SLA Target</span>
                <strong className={styles.slaDetailVal}>1,223 Tickets</strong>
              </div>

              <div className={styles.slaDetailItem}>
                <span className={styles.slaStatusDot} style={{ background: '#FF9F0A' }} />
                <span className={styles.slaDetailLabel}>At Risk (&lt; 30m)</span>
                <strong className={styles.slaDetailVal}>18 Tickets</strong>
              </div>

              <div className={styles.slaDetailItem}>
                <span className={styles.slaStatusDot} style={{ background: '#FF453A' }} />
                <span className={styles.slaDetailLabel}>SLA Breached</span>
                <strong className={styles.slaDetailVal}>7 Tickets</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Agent Workload Table (Strictly NO Leaderboards or Rankings) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Agent Operational Performance</h3>
            <p className={styles.cardDesc}>System-wide agent queue metrics and average response speeds.</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Assigned Queue</th>
                <th>Resolved</th>
                <th>Pending</th>
                <th>Avg First Response</th>
                <th>SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              {adminAgentOperationalOverview.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <div className={styles.agentCell}>
                      <span className={styles.avatar}>{agent.agent.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong className={styles.agentName}>{agent.agent}</strong>
                        <span className={styles.agentEmail}>{agent.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{agent.assigned} tickets</td>
                  <td>{agent.resolved} completed</td>
                  <td>{agent.pending} pending</td>
                  <td>
                    <span className={styles.timeTag}>22 min</span>
                  </td>
                  <td>
                    <strong className={styles.slaText}>{agent.sla}</strong>
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
