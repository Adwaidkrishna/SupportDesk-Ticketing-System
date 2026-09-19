import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgentAssignedTickets } from '../services/agentTicket.service';
import Select from '../../../components/common/Select';
import styles from './MyQueue.module.css';

/**
 * My Assigned Tickets Page.
 * Displays only tickets assigned to the authenticated support agent.
 *
 * Distinction:
 * - Available Tickets (/agent/queue): status === OPEN && assignedTo === null
 * - My Assigned Tickets (/agent/my-tickets): assignedTo === currentAgent
 */
export default function MyAssignedTickets() {
  const navigate = useNavigate();

  // Backend state
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('IN_PROGRESS');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchAssignedTickets = useCallback(async (pageToLoad = 1, currentStatus = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAgentAssignedTickets({
        page: pageToLoad,
        limit: 10,
        status: currentStatus,
      });
      if (response && response.success) {
        setTickets(response.data.tickets || []);
        setPagination(
          response.data.pagination || { page: pageToLoad, limit: 10, total: 0, totalPages: 1 }
        );
      } else {
        throw new Error(response?.message || 'Failed to fetch assigned tickets.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access restricted to support agents.');
      } else {
        setError(err.response?.data?.message || err.message || 'Unable to load assigned tickets.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAssignedTickets(1, statusFilter);
  }, [fetchAssignedTickets, statusFilter]);

  // Derived available categories from real ticket dataset
  const availableCategories = useMemo(() => {
    const cats = new Set();
    tickets.forEach((t) => {
      if (t.category?.name) cats.add(t.category.name);
    });
    return Array.from(cats);
  }, [tickets]);

  // Client-side filtering across the current loaded page
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch =
        search === '' ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(search)) ||
        (t.subject && t.subject.toLowerCase().includes(search)) ||
        (t.customer?.name && t.customer.name.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === 'all' ||
        (t.status && t.status.toUpperCase() === statusFilter.toUpperCase());

      const matchesPriority =
        priorityFilter === 'all' ||
        (t.priority && t.priority.toUpperCase() === priorityFilter.toUpperCase());

      const matchesCategory =
        categoryFilter === 'all' ||
        (t.category?.name && t.category.name.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
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
        return styles.statusWarning;
      case 'RESOLVED':
      case 'CLOSED':
        return styles.statusInfo;
      default:
        return styles.statusMuted;
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>MY ASSIGNED TICKETS</span>
          <h1 className={styles.title}>My Assigned Tickets</h1>
          <p className={styles.subtitle}>
            Tickets assigned to you for active resolution and real-time support
          </p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{pagination.total ?? tickets.length}</span>
            <span className={styles.statLbl}>Total Assigned</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statVal} style={{ color: '#FF9F0A' }}>
              {tickets.filter((t) => t.status === 'IN_PROGRESS').length}
            </span>
            <span className={styles.statLbl}>In Progress</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => fetchAssignedTickets(pagination.page)}
          >
            Retry
          </button>
        </div>
      )}

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
              placeholder="Search assigned tickets by number, subject, or customer..."
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
                { value: 'URGENT', label: 'Urgent Priority', badge: 'P1', badgeColor: '#FF453A' },
                { value: 'HIGH', label: 'High Priority', badge: 'P2', badgeColor: '#FF9F0A' },
                { value: 'MEDIUM', label: 'Medium Priority', badge: 'P3', badgeColor: '#64D2FF' },
                { value: 'LOW', label: 'Low Priority', badge: 'P4', badgeColor: '#94A3B8' },
              ]}
              value={priorityFilter}
              onChange={setPriorityFilter}
            />

            <Select
              options={[
                { value: 'all', label: 'All Categories' },
                ...availableCategories.map((c) => ({ value: c.toLowerCase(), label: c })),
              ]}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'IN_PROGRESS' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'RESOLVED' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            Resolved
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'ALL' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Assigned
          </button>
        </div>
      </div>

      {/* Tickets List Section */}
      <div className={styles.listCard}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your assigned tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3 className={styles.emptyTitle}>No assigned tickets</h3>
            <p className={styles.emptyDesc}>
              You currently have no tickets assigned to you. Claim tickets from the Available Tickets queue to start active support.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={() => navigate('/agent/queue')}
            >
              Browse Available Tickets →
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No matching tickets found</h3>
            <p className={styles.emptyDesc}>
              Try adjusting your search keywords or priority and category filters.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
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
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr
                      key={t.id || t._id}
                      className={styles.tableRow}
                      onClick={() => navigate(`/agent/tickets/${t.id || t._id}`)}
                    >
                      <td className={styles.idCell}>{t.ticketNumber || t._id}</td>
                      <td className={styles.subjectCell}>{t.subject}</td>
                      <td className={styles.customerCell}>
                        {t.customer?.name || 'Customer'}
                      </td>
                      <td>
                        <span className={styles.catBadge}>
                          {t.category?.name || 'Support'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.priorityBadge} ${getPriorityBadgeClass(t.priority)}`}>
                          {t.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass(t.status)}`}>
                          {t.status || 'IN_PROGRESS'}
                        </span>
                      </td>
                      <td className={styles.timeCell}>
                        {formatTimestamp(t.updatedAt || t.createdAt)}
                      </td>
                      <td>
                        <span className={styles.actionLink}>Open Chat →</span>
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
                  key={t.id || t._id}
                  className={styles.mobileCard}
                  onClick={() => navigate(`/agent/tickets/${t.id || t._id}`)}
                >
                  <div className={styles.mobileTop}>
                    <span className={styles.idCell}>{t.ticketNumber || t._id}</span>
                    <span className={`${styles.priorityBadge} ${getPriorityBadgeClass(t.priority)}`}>
                      {t.priority || 'MEDIUM'}
                    </span>
                  </div>

                  <h4 className={styles.mobileSubject}>{t.subject}</h4>

                  <div className={styles.mobileMeta}>
                    <span>👤 {t.customer?.name || 'Customer'}</span>
                    <span className={styles.catBadge}>{t.category?.name || 'Support'}</span>
                  </div>

                  <div className={styles.mobileFooter}>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(t.status)}`}>
                      {t.status || 'IN_PROGRESS'}
                    </span>
                    <span className={styles.timeCell}>
                      ⏱ {formatTimestamp(t.updatedAt || t.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Row */}
            {pagination.totalPages > 1 && (
              <div className={styles.paginationRow}>
                <span className={styles.paginationInfo}>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets total)
                </span>
                <div className={styles.paginationBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={!pagination.hasPreviousPage || loading}
                    onClick={() => fetchAssignedTickets(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => fetchAssignedTickets(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
