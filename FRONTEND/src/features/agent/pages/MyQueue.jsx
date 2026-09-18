import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgentQueue } from '../services/agentTicket.service';
import Select from '../../../components/common/Select';
import styles from './MyQueue.module.css';

export default function MyQueue() {
  const navigate = useNavigate();

  // Backend state
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchQueue = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAgentQueue({ page: pageToLoad, limit: 10 });
      if (response && response.success) {
        setTickets(response.data.tickets || []);
        setPagination(
          response.data.pagination || { page: pageToLoad, limit: 10, total: 0, totalPages: 1 }
        );
      } else {
        throw new Error(response?.message || 'Failed to fetch tickets.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access restricted to support agents.');
      } else {
        setError(err.response?.data?.message || err.message || 'Unable to load available tickets.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(1);
  }, [fetchQueue]);

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
          <span className={styles.badgeLabel}>AVAILABLE TICKETS</span>
          <h1 className={styles.title}>Available Tickets</h1>
          <p className={styles.subtitle}>Tickets waiting to be claimed</p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statVal}>{pagination.total ?? tickets.length}</span>
            <span className={styles.statLbl}>Total Available</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statVal} style={{ color: '#FF9F0A' }}>
              {tickets.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length}
            </span>
            <span className={styles.statLbl}>High / Urgent</span>
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
            onClick={() => fetchQueue(pagination.page)}
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
              placeholder="Search by ticket number, subject, or customer name..."
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
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Available ({pagination.total ?? tickets.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'OPEN' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('OPEN')}
          >
            Open
          </button>
        </div>
      </div>

      {/* Tickets List Section */}
      <div className={styles.listCard}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading available tickets from queue...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📥</div>
            <h3 className={styles.emptyTitle}>No tickets in queue</h3>
            <p className={styles.emptyDesc}>
              There are currently no unassigned customer tickets waiting to be claimed.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={() => fetchQueue(1)}
            >
              Refresh Queue
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
                    <th>Created</th>
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
                          {t.status || 'OPEN'}
                        </span>
                      </td>
                      <td className={styles.timeCell}>
                        {formatTimestamp(t.createdAt)}
                      </td>
                      <td>
                        <span className={styles.actionLink}>View →</span>
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
                      {t.status || 'OPEN'}
                    </span>
                    <span className={styles.timeCell}>
                      ⏱ {formatTimestamp(t.createdAt)}
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
                    onClick={() => fetchQueue(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => fetchQueue(pagination.page + 1)}
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
