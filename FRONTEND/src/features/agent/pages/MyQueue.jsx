import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { myQueueTickets } from '../agentMockData';
import Select from '../../../components/common/Select';
import styles from './MyQueue.module.css';

export default function MyQueue() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  // Filter logic
  const filteredTickets = myQueueTickets.filter((t) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      t.status.toLowerCase().replace(/\s+/g, '_') === statusFilter.toLowerCase().replace(/\s+/g, '_');

    const matchesPriority =
      priorityFilter === 'all' ||
      t.priority.toLowerCase() === priorityFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === 'all' ||
      t.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesSla =
      slaFilter === 'all' ||
      (slaFilter === 'at_risk' && t.slaStatus === 'at_risk') ||
      (slaFilter === 'normal' && t.slaStatus === 'normal');

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesSla;
  });

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

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>MY WORKLOAD</span>
          <h1 className={styles.title}>My Queue</h1>
          <p className={styles.subtitle}>Manage tickets currently assigned to you for resolution.</p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{myQueueTickets.length}</span>
            <span className={styles.statLbl}>Total Assigned</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statVal} style={{ color: '#FF9F0A' }}>
              {myQueueTickets.filter((t) => t.slaStatus === 'at_risk').length}
            </span>
            <span className={styles.statLbl}>SLA At Risk</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterCard}>
        {/* Top Search & Filter Selects */}
        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by ticket ID, subject, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.selectsRow}>
            <Select
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'critical', label: 'Critical Priority', badge: 'P1', badgeColor: '#FF453A' },
                { value: 'high', label: 'High Priority', badge: 'P2', badgeColor: '#FF9F0A' },
                { value: 'medium', label: 'Medium Priority', badge: 'P3', badgeColor: '#64D2FF' },
                { value: 'low', label: 'Low Priority', badge: 'P4', badgeColor: '#94A3B8' },
              ]}
              value={priorityFilter}
              onChange={setPriorityFilter}
            />

            <Select
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'account', label: 'Account' },
                { value: 'billing', label: 'Billing' },
                { value: 'technical', label: 'Technical' },
                { value: 'integrations', label: 'Integrations' },
              ]}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />

            <Select
              options={[
                { value: 'all', label: 'All SLA Status' },
                { value: 'at_risk', label: 'At Risk', badge: 'Risk', badgeColor: '#FF9F0A' },
                { value: 'normal', label: 'Within SLA', badge: 'Met', badgeColor: '#30D158' },
              ]}
              value={slaFilter}
              onChange={setSlaFilter}
            />
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Tickets ({myQueueTickets.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'open' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Open
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'in_progress' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'waiting_for_customer' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('waiting_for_customer')}
          >
            Waiting for Customer
          </button>
        </div>
      </div>

      {/* Tickets List Section */}
      <div className={styles.listCard}>
        {filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No tickets found in your queue</h3>
            <p className={styles.emptyDesc}>
              Try adjusting your search keywords or filter criteria.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setSlaFilter('all');
              }}
            >
              Reset Filters
            </button>
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
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA Remaining</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className={styles.tableRow}
                      onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
                    >
                      <td className={styles.idCell}>{t.id}</td>
                      <td className={styles.subjectCell}>{t.subject}</td>
                      <td className={styles.customerCell}>{t.customer}</td>
                      <td>
                        <span className={styles.catBadge}>{t.category}</span>
                      </td>
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
                      <td className={t.slaStatus === 'at_risk' ? styles.slaAtRisk : styles.slaNormal}>
                        {t.sla}
                      </td>
                      <td className={styles.timeCell}>{t.updated}</td>
                      <td>
                        <span className={styles.actionLink}>Open →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className={styles.mobileList}>
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className={styles.mobileCard}
                  onClick={() => navigate(`/agent/tickets/${t.id.replace('#', '')}`)}
                >
                  <div className={styles.mobileTop}>
                    <span className={styles.idCell}>{t.id}</span>
                    <span
                      className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                        t.priorityVariant
                      )}`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <h4 className={styles.mobileSubject}>{t.subject}</h4>

                  <div className={styles.mobileMeta}>
                    <span>👤 {t.customer}</span>
                    <span className={styles.catBadge}>{t.category}</span>
                  </div>

                  <div className={styles.mobileFooter}>
                    <span
                      className={`${styles.statusBadge} ${getStatusBadgeClass(
                        t.statusVariant
                      )}`}
                    >
                      {t.status}
                    </span>
                    <span className={t.slaStatus === 'at_risk' ? styles.slaAtRisk : styles.slaNormal}>
                      ⏱ {t.sla}
                    </span>
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
