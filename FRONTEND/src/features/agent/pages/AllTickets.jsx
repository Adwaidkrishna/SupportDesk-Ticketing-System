import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allAgentTicketsList } from '../agentMockData';
import styles from './AllTickets.module.css';

export default function AllTickets() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const filteredTickets = allAgentTicketsList.filter((t) => {
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

    const matchesAgent =
      agentFilter === 'all' ||
      (agentFilter === 'my_tickets' && t.assignedAgent === 'Alex Johnson') ||
      (agentFilter === 'unassigned' && t.assignedAgent === 'Unassigned');

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAgent;
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
          <span className={styles.badgeLabel}>SYSTEM DIRECTORY</span>
          <h1 className={styles.title}>All Tickets</h1>
          <p className={styles.subtitle}>
            Browse, search, and manage all support requests submitted across the organization.
          </p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{allAgentTicketsList.length}</span>
            <span className={styles.statLbl}>Total System Tickets</span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className={styles.filterCard}>
        {/* Search & Filters Grid */}
        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search all tickets by ID, subject, customer, or keyword..."
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
            <select
              className={styles.selectInput}
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="all">All Agents</option>
              <option value="my_tickets">Assigned to Me</option>
              <option value="unassigned">Unassigned Only</option>
            </select>

            <select
              className={styles.selectInput}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              className={styles.selectInput}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="integrations">Integrations</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({allAgentTicketsList.length})
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

      {/* List Card */}
      <div className={styles.listCard}>
        {filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📂</div>
            <h3 className={styles.emptyTitle}>No matching tickets found</h3>
            <p className={styles.emptyDesc}>
              No tickets matched your filter criteria. Try clearing search filters.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setAgentFilter('all');
              }}
            >
              Clear All Filters
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
                    <th>Assigned Agent</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA</th>
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
                      <td className={styles.agentCell}>{t.assignedAgent || 'Unassigned'}</td>
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
                      <td
                        className={
                          t.slaStatus === 'breached'
                            ? styles.slaBreached
                            : t.slaStatus === 'at_risk'
                            ? styles.slaAtRisk
                            : styles.slaNormal
                        }
                      >
                        {t.sla}
                      </td>
                      <td>
                        <span className={styles.actionLink}>View →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
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
                    <span>👨‍💻 {t.assignedAgent || 'Unassigned'}</span>
                  </div>

                  <div className={styles.mobileFooter}>
                    <span
                      className={`${styles.statusBadge} ${getStatusBadgeClass(
                        t.statusVariant
                      )}`}
                    >
                      {t.status}
                    </span>
                    <span className={t.slaStatus === 'at_risk' ? styles.slaAtRisk : ''}>
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
