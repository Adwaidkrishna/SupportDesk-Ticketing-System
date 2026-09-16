import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentAgent,
  agentDashboardKPIs,
  myQueueTickets,
  slaOverviewStats,
  needsAttentionList,
  workloadChartData,
  agentRecentActivity,
} from '../agentMockData';
import styles from './AgentDashboard.module.css';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [internalNoteModalOpen, setInternalNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [targetTicket, setTargetTicket] = useState('#1024');

  const handleSaveInternalNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    alert(`Internal note added to ${targetTicket} successfully!`);
    setNoteText('');
    setInternalNoteModalOpen(false);
  };

  const getPriorityBadgeClass = (variant) => {
    switch (variant) {
      case 'critical':
        return styles.priorityCritical;
      case 'high':
        return styles.priorityHigh;
      case 'medium':
        return styles.priorityMedium;
      case 'low':
      default:
        return styles.priorityLow;
    }
  };

  const getStatusBadgeClass = (variant) => {
    switch (variant) {
      case 'info':
        return styles.statusInfo;
      case 'warning':
        return styles.statusWarning;
      case 'open':
        return styles.statusOpen;
      default:
        return styles.statusMuted;
    }
  };

  const renderKPIIcon = (icon) => {
    switch (icon) {
      case 'user-check':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'hourglass':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
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
  };

  return (
    <div className={styles.page}>
      {/* Header Banner */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.badgeLabel}>AGENT WORKSPACE</span>
          <h1 className={styles.title}>Good morning, {currentAgent.name.split(' ')[0]}!</h1>
          <p className={styles.subtitle}>Here's what needs your attention today.</p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.dateBadge}>
            <span className={styles.dateIcon}>📅</span>
            <span>Wed, Sep 16, 2026</span>
          </div>

          <button
            type="button"
            className={styles.queueBtn}
            onClick={() => navigate('/agent/queue')}
          >
            Go to My Queue →
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (6 Cards) */}
      <div className={styles.kpiGrid}>
        {agentDashboardKPIs.map((kpi) => (
          <div key={kpi.id} className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <div
                className={styles.kpiIconWrap}
                style={{ backgroundColor: kpi.bgColor, color: kpi.color }}
              >
                {renderKPIIcon(kpi.icon)}
              </div>
              <span className={styles.kpiChange} style={{ color: kpi.color }}>
                {kpi.change}
              </span>
            </div>
            <div className={styles.kpiVal}>{kpi.value}</div>
            <div className={styles.kpiLabel}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: My Queue (wide 2fr) + SLA & Needs Attention (1fr) */}
      <div className={styles.mainGrid}>
        {/* Left Column: My Queue Table */}
        <div className={styles.queueCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>My Queue</h2>
              <p className={styles.cardSub}>Active tickets assigned directly to you</p>
            </div>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={() => navigate('/agent/queue')}
            >
              View all ({myQueueTickets.length}) →
            </button>
          </div>

          {/* Desktop Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject</th>
                  <th>Customer</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {myQueueTickets.map((t) => (
                  <tr
                    key={t.id}
                    className={styles.tableRow}
                    onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
                  >
                    <td className={styles.ticketIdCell}>{t.id}</td>
                    <td className={styles.subjectCell}>{t.subject}</td>
                    <td className={styles.customerCell}>{t.customer}</td>
                    <td>
                      <span
                        className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                          t.priorityVariant
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusBadgeClass(
                          t.statusVariant
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td
                      className={
                        t.slaStatus === 'at_risk' ? styles.slaAtRisk : styles.slaNormal
                      }
                    >
                      {t.sla}
                    </td>
                    <td className={styles.timeCell}>{t.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className={styles.mobileQueueList}>
            {myQueueTickets.map((t) => (
              <div
                key={t.id}
                className={styles.mobileQueueCard}
                onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
              >
                <div className={styles.mobileQueueTop}>
                  <span className={styles.ticketIdCell}>{t.id}</span>
                  <span
                    className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                      t.priorityVariant
                    )}`}
                  >
                    {t.priority}
                  </span>
                </div>
                <h4 className={styles.mobileSubject}>{t.subject}</h4>
                <div className={styles.mobileMetaRow}>
                  <span>👤 {t.customer}</span>
                  <span className={t.slaStatus === 'at_risk' ? styles.slaAtRisk : ''}>
                    ⏱ {t.sla}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: SLA Overview & Needs Your Attention */}
        <div className={styles.rightCol}>
          {/* SLA Overview Card */}
          <div className={styles.slaCard}>
            <h3 className={styles.cardTitle}>SLA Overview</h3>
            <p className={styles.cardSub}>Total Active: {slaOverviewStats.total} Tickets</p>

            <div className={styles.slaMeterArea}>
              <div className={styles.slaBarTrack}>
                <div
                  className={styles.slaBarWithin}
                  style={{
                    width: `${(slaOverviewStats.withinSLA / slaOverviewStats.total) * 100}%`,
                  }}
                  title={`Within SLA: ${slaOverviewStats.withinSLA}`}
                />
                <div
                  className={styles.slaBarRisk}
                  style={{
                    width: `${(slaOverviewStats.atRisk / slaOverviewStats.total) * 100}%`,
                  }}
                  title={`At Risk: ${slaOverviewStats.atRisk}`}
                />
                <div
                  className={styles.slaBarBreached}
                  style={{
                    width: `${(slaOverviewStats.breached / slaOverviewStats.total) * 100}%`,
                  }}
                  title={`Breached: ${slaOverviewStats.breached}`}
                />
              </div>

              <div className={styles.slaLegend}>
                <div className={styles.slaLegendItem}>
                  <span className={styles.dotGreen} />
                  <span>Within SLA: <strong>{slaOverviewStats.withinSLA}</strong></span>
                </div>
                <div className={styles.slaLegendItem}>
                  <span className={styles.dotOrange} />
                  <span>At Risk: <strong>{slaOverviewStats.atRisk}</strong></span>
                </div>
                <div className={styles.slaLegendItem}>
                  <span className={styles.dotRed} />
                  <span>Breached: <strong>{slaOverviewStats.breached}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Needs Your Attention Card */}
          <div className={styles.attentionCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Needs Your Attention</h3>
              <span className={styles.urgentDot}>🚨</span>
            </div>

            <div className={styles.attentionList}>
              {needsAttentionList.map((item) => (
                <div
                  key={item.id}
                  className={styles.attentionItem}
                  onClick={() => navigate(`/agent/tickets/${item.id.replace('#', '')}`)}
                >
                  <div className={styles.attTop}>
                    <span className={styles.attId}>{item.id}</span>
                    <span className={styles.attBadge} style={{ color: item.priorityColor }}>
                      {item.badge}
                    </span>
                  </div>
                  <h4 className={styles.attSubject}>{item.subject}</h4>
                  <span className={styles.attTime}>{item.timeRemaining}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Workload Chart (2fr) + Recent Activity & Quick Actions (1fr) */}
      <div className={styles.bottomGrid}>
        {/* Workload Weekly Activity Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Weekly Activity</h3>
              <p className={styles.cardSub}>Assigned vs Resolved workload count</p>
            </div>
          </div>

          <div className={styles.chartContainer}>
            {workloadChartData.days.map((day, idx) => {
              const assignedVal = workloadChartData.assigned[idx];
              const resolvedVal = workloadChartData.resolved[idx];
              const maxVal = 20;
              return (
                <div key={day} className={styles.chartBarCol}>
                  <div className={styles.barsGroup}>
                    <div
                      className={styles.barAssigned}
                      style={{ height: `${(assignedVal / maxVal) * 100}%` }}
                      title={`Assigned: ${assignedVal}`}
                    />
                    <div
                      className={styles.barResolved}
                      style={{ height: `${(resolvedVal / maxVal) * 100}%` }}
                      title={`Resolved: ${resolvedVal}`}
                    />
                  </div>
                  <span className={styles.dayLabel}>{day}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendEntry}>
              <span className={styles.blueBox} />
              <span>Assigned</span>
            </div>
            <div className={styles.legendEntry}>
              <span className={styles.greenBox} />
              <span>Resolved</span>
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className={styles.sideFeedCol}>
          {/* Quick Actions */}
          <div className={styles.quickActionsCard}>
            <h3 className={styles.cardTitle}>Quick Actions</h3>
            <div className={styles.quickGrid}>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => navigate('/agent/queue')}
              >
                <span>📥 View My Queue</span>
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => navigate('/agent/escalated')}
              >
                <span>🚨 View Escalated</span>
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => navigate('/agent/tickets')}
              >
                <span>🔍 Search Tickets</span>
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => setInternalNoteModalOpen(true)}
              >
                <span>📝 Add Internal Note</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className={styles.activityFeedCard}>
            <h3 className={styles.cardTitle}>Recent Activity</h3>
            <div className={styles.feedList}>
              {agentRecentActivity.map((act) => (
                <div key={act.id} className={styles.feedItem}>
                  <div className={styles.feedBullet} />
                  <div className={styles.feedContent}>
                    <p className={styles.feedText}>{act.text}</p>
                    <span className={styles.feedTime}>{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Note Modal */}
      {internalNoteModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setInternalNoteModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Internal Note</h3>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setInternalNoteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInternalNote} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Target Ticket Number</label>
                <select
                  className={styles.selectInput}
                  value={targetTicket}
                  onChange={(e) => setTargetTicket(e.target.value)}
                >
                  {myQueueTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} - {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Internal Note Content</label>
                <textarea
                  className={styles.textareaInput}
                  placeholder="Enter confidential agent notes, investigation details, or logs (visible only to internal support staff)..."
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setInternalNoteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Save Internal Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
