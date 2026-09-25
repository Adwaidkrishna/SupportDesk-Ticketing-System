import { useState, useEffect, useCallback } from 'react';
import { getAdminReports } from '../services/adminReports.service';
import styles from './Reports.module.css';

export default function Reports() {
  const [timeframe, setTimeframe] = useState('30d');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminReports({ timeframe });
      if (res && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err?.message || 'Failed to retrieve analytics and reports.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = () => {
    if (!reportData) return;
    const summary = reportData.summary;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Avg Resolution Time,${summary.avgResolutionTime}\n` +
      `Avg First Response,${summary.avgFirstResponse}\n` +
      `Resolution Rate,${summary.resolutionRate}\n` +
      `Reopen Rate,${summary.reopenRate}\n` +
      `Overall SLA Compliance,${summary.slaPerformance.overallCompliance}\n` +
      `Within SLA Target,${summary.slaPerformance.withinSLA}\n` +
      `At Risk,${summary.slaPerformance.atRisk}\n` +
      `SLA Breached,${summary.slaPerformance.breached}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supportdesk_report_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Operational report for ${timeframe} exported successfully.`);
  };

  const summary = reportData?.summary || {
    avgResolutionTime: 'N/A',
    avgFirstResponse: 'N/A',
    resolutionRate: '100.0%',
    reopenRate: '0.0%',
    categoryBreakdown: [],
    slaPerformance: {
      overallCompliance: '100.0%',
      withinSLA: 0,
      atRisk: 0,
      breached: 0,
    },
  };

  const chartData = reportData?.volumeTrends || {
    days: [],
    created: [],
    resolved: [],
  };

  const agentOperationalOverview = reportData?.agentPerformance || [];

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

          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={loading || !reportData}
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className={styles.card}
          style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
            Loading Reports & Analytics...
          </h3>
          <p style={{ color: '#8e8e93', margin: 0 }}>
            Querying live ticket aggregates and operational metrics for {timeframe}.
          </p>
        </div>
      ) : error ? (
        <div
          className={styles.card}
          style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
            Failed to Load Reports
          </h3>
          <p style={{ color: '#FF453A', margin: '0 0 1.25rem' }}>{error}</p>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={fetchReports}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Resolution Analytics KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Avg Resolution Time</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>{summary.avgResolutionTime}</span>
                <span className={styles.kpiSub}>Based on closed tickets</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Avg First Response</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue} style={{ color: '#30D158' }}>
                  {summary.avgFirstResponse}
                </span>
                <span className={styles.kpiSub}>SLA Response Speed</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Resolution Rate</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue} style={{ color: '#0A84FF' }}>
                  {summary.resolutionRate}
                </span>
                <span className={styles.kpiSub}>Resolved vs Total</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Reopen Rate</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>
                  {summary.reopenRate}
                </span>
                <span className={styles.kpiSub}>Customer reopens</span>
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
              {chartData.days.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8e8e93', width: '100%' }}>
                  No ticket activity recorded for this period.
                </div>
              ) : (
                chartData.days.map((day, idx) => {
                  const cVal = chartData.created[idx] || 0;
                  const rVal = chartData.resolved[idx] || 0;
                  const maxVal = Math.max(...chartData.created, ...chartData.resolved, 1);
                  const cHeight = Math.max(4, Math.round((cVal / maxVal) * 100));
                  const rHeight = Math.max(4, Math.round((rVal / maxVal) * 100));

                  return (
                    <div key={day} className={styles.barGroup}>
                      <div className={styles.barsPair}>
                        <div
                          className={styles.barCreated}
                          style={{ height: `${cVal > 0 ? cHeight : 4}%` }}
                          title={`Created: ${cVal}`}
                        />
                        <div
                          className={styles.barResolved}
                          style={{ height: `${rVal > 0 ? rHeight : 4}%` }}
                          title={`Resolved: ${rVal}`}
                        />
                      </div>
                      <span className={styles.barDayLabel}>{day}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2-Column Grid: Category Analytics & SLA Compliance Breakdown */}
          <div className={styles.grid2}>
            {/* Category Breakdown */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Volume by Category</h3>
              <p className={styles.cardDesc}>Proportion of tickets submitted across primary taxonomies.</p>

              <div className={styles.categoryList}>
                {summary.categoryBreakdown.length === 0 ? (
                  <p style={{ color: '#8e8e93', padding: '1rem 0' }}>No categorized tickets in this timeframe.</p>
                ) : (
                  summary.categoryBreakdown.map((cat) => (
                    <div key={cat.category} className={styles.catRow}>
                      <div className={styles.catMeta}>
                        <span className={styles.catName}>{cat.category}</span>
                        <span className={styles.catVal}>{cat.count} tickets ({cat.percent}%)</span>
                      </div>
                      <div className={styles.barBg}>
                        <div className={styles.barFill} style={{ width: `${cat.percent}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SLA Compliance Breakdown */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>SLA Performance Overview</h3>
              <p className={styles.cardDesc}>Compliance adherence against Service Level Agreement targets.</p>

              <div className={styles.slaStatsContainer}>
                <div className={styles.slaLargeBox}>
                  <div className={styles.slaPercent}>{summary.slaPerformance.overallCompliance}</div>
                  <div className={styles.slaTag}>Overall SLA Compliance</div>
                </div>

                <div className={styles.slaDetailsList}>
                  <div className={styles.slaDetailItem}>
                    <span className={styles.slaStatusDot} style={{ background: '#30D158' }} />
                    <span className={styles.slaDetailLabel}>Within SLA Target</span>
                    <strong className={styles.slaDetailVal}>{summary.slaPerformance.withinSLA} Tickets</strong>
                  </div>

                  <div className={styles.slaDetailItem}>
                    <span className={styles.slaStatusDot} style={{ background: '#FF9F0A' }} />
                    <span className={styles.slaDetailLabel}>At Risk</span>
                    <strong className={styles.slaDetailVal}>{summary.slaPerformance.atRisk} Tickets</strong>
                  </div>

                  <div className={styles.slaDetailItem}>
                    <span className={styles.slaStatusDot} style={{ background: '#FF453A' }} />
                    <span className={styles.slaDetailLabel}>SLA Breached</span>
                    <strong className={styles.slaDetailVal}>{summary.slaPerformance.breached} Tickets</strong>
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
                  {agentOperationalOverview.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#8e8e93' }}>
                        No support agents registered in the system.
                      </td>
                    </tr>
                  ) : (
                    agentOperationalOverview.map((agent) => (
                      <tr key={agent.id}>
                        <td>
                          <div className={styles.agentCell}>
                            <span className={styles.avatar}>
                              {agent.agent ? agent.agent.slice(0, 2).toUpperCase() : 'AG'}
                            </span>
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
                          <span className={styles.timeTag}>{agent.avgFirstResponse}</span>
                        </td>
                        <td>
                          <strong className={styles.slaText}>{agent.sla}</strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
