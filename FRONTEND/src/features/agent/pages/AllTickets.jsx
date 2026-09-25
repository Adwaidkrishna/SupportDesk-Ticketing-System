import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAgentTickets } from '../services/agentTicket.service';
import api from '../../../services/api';
import Select from '../../../components/common/Select';
import styles from './AllTickets.module.css';

export default function AllTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Retrieve current user for "Assigned to Me" filter
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllAgentTickets({ limit: 100 });
      if (res && res.data) {
        setTickets(res.data.tickets || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError(err?.message || 'Failed to load tickets from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      if (res && res.data) {
        setCategories(Array.isArray(res.data) ? res.data : res.data.categories || []);
      }
    } catch (err) {
      console.warn('Could not load categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchCategories();
  }, [fetchTickets, fetchCategories]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.customer?.name && t.customer.name.toLowerCase().includes(q)) ||
        (t.customer?.email && t.customer.email.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (t.status && t.status.toUpperCase() === statusFilter.toUpperCase());

      const matchesPriority =
        priorityFilter === 'all' ||
        (t.priority && t.priority.toUpperCase() === priorityFilter.toUpperCase());

      const matchesCategory =
        categoryFilter === 'all' ||
        t.categoryId === categoryFilter ||
        (t.category?.name && t.category.name.toLowerCase() === categoryFilter.toLowerCase());

      const matchesAgent =
        agentFilter === 'all' ||
        (agentFilter === 'my_tickets' &&
          currentUser &&
          (t.assignedTo?._id === currentUser._id ||
            t.assignedTo?.id === currentUser._id ||
            t.agent === currentUser.name)) ||
        (agentFilter === 'unassigned' && (!t.assignedTo || t.agent === 'Unassigned'));

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAgent;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter, agentFilter, currentUser]);

  const getPriorityBadgeClass = (priority) => {
    switch (priority ? priority.toUpperCase() : '') {
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
    switch (status ? status.toUpperCase() : '') {
      case 'RESOLVED':
        return styles.statusInfo;
      case 'IN_PROGRESS':
        return styles.statusWarning;
      case 'OPEN':
        return styles.statusOpen;
      default:
        return styles.statusMuted;
    }
  };

  const [currentTime] = useState(() => Date.now());

  const getSlaInfo = (ticket, nowTs = currentTime) => {
    if (!ticket.sla) return { text: 'Standard SLA', status: 'normal' };
    if (ticket.sla.isBreached || ticket.sla.resolutionBreached) {
      return { text: 'Breached', status: 'breached' };
    }
    if (ticket.sla.resolutionDeadline) {
      const remainingMs = new Date(ticket.sla.resolutionDeadline).getTime() - nowTs;
      if (remainingMs <= 0) return { text: 'Breached', status: 'breached' };
      const mins = Math.round(remainingMs / (60 * 1000));
      if (mins < 60) return { text: `${mins}m left`, status: 'at_risk' };
      const hrs = Math.round(mins / 60);
      return { text: `${hrs}h left`, status: 'normal' };
    }
    return { text: ticket.sla.policyName || 'Standard SLA', status: 'normal' };
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
            <span className={styles.statVal}>{stats.total ?? tickets.length}</span>
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
            <Select
              options={[
                { value: 'all', label: 'All Agents' },
                { value: 'my_tickets', label: 'Assigned to Me', initials: 'ME' },
                { value: 'unassigned', label: 'Unassigned Only', initials: 'UN' },
              ]}
              value={agentFilter}
              onChange={setAgentFilter}
            />

            <Select
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent', badge: 'P1', badgeColor: '#FF453A' },
                { value: 'HIGH', label: 'High', badge: 'P2', badgeColor: '#FF9F0A' },
                { value: 'MEDIUM', label: 'Medium', badge: 'P3', badgeColor: '#64D2FF' },
                { value: 'LOW', label: 'Low', badge: 'P4', badgeColor: '#94A3B8' },
              ]}
              value={priorityFilter}
              onChange={setPriorityFilter}
            />

            <Select
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({
                  value: c._id || c.name.toLowerCase(),
                  label: c.name,
                })),
              ]}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({stats.total ?? tickets.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'OPEN' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('OPEN')}
          >
            Open ({stats.open ?? 0})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'IN_PROGRESS' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            In Progress ({stats.inProgress ?? 0})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'RESOLVED' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            Resolved ({stats.resolved ?? 0})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${statusFilter === 'CLOSED' ? styles.activeTab : ''}`}
            onClick={() => setStatusFilter('CLOSED')}
          >
            Closed ({stats.closed ?? 0})
          </button>
        </div>
      </div>

      {/* List Card */}
      <div className={styles.listCard}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            <h3 className={styles.emptyTitle}>Loading Tickets...</h3>
            <p className={styles.emptyDesc}>Retrieving tickets from live backend.</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <h3 className={styles.emptyTitle}>Failed to Load Tickets</h3>
            <p className={styles.emptyDesc}>{error}</p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={fetchTickets}
            >
              Retry
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
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
                  {filteredTickets.map((t) => {
                    const ticketIdStr = t.ticketNumber || t.id || t._id;
                    const customerName = t.customer?.name || t.customer?.email || 'Unknown';
                    const agentName = t.agent || t.assignedTo?.name || 'Unassigned';
                    const categoryName = t.category?.name || 'General';
                    const slaInfo = getSlaInfo(t);

                    return (
                      <tr
                        key={t.id || t._id}
                        className={styles.tableRow}
                        onClick={() => navigate(`/agent/tickets/${ticketIdStr}`)}
                      >
                        <td className={styles.idCell}>{ticketIdStr}</td>
                        <td className={styles.subjectCell}>{t.subject}</td>
                        <td className={styles.customerCell}>{customerName}</td>
                        <td className={styles.agentCell}>{agentName}</td>
                        <td>
                          <span className={styles.catBadge}>{categoryName}</span>
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
                        <td
                          className={
                            slaInfo.status === 'breached'
                              ? styles.slaBreached
                              : slaInfo.status === 'at_risk'
                              ? styles.slaAtRisk
                              : styles.slaNormal
                          }
                        >
                          {slaInfo.text}
                        </td>
                        <td>
                          <span className={styles.actionLink}>View →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={styles.mobileList}>
              {filteredTickets.map((t) => {
                const ticketIdStr = t.ticketNumber || t.id || t._id;
                const customerName = t.customer?.name || t.customer?.email || 'Unknown';
                const agentName = t.agent || t.assignedTo?.name || 'Unassigned';
                const slaInfo = getSlaInfo(t);

                return (
                  <div
                    key={t.id || t._id}
                    className={styles.mobileCard}
                    onClick={() => navigate(`/agent/tickets/${ticketIdStr}`)}
                  >
                    <div className={styles.mobileTop}>
                      <span className={styles.idCell}>{ticketIdStr}</span>
                      <span
                        className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <h4 className={styles.mobileSubject}>{t.subject}</h4>

                    <div className={styles.mobileMeta}>
                      <span>👤 {customerName}</span>
                      <span>👨‍💻 {agentName}</span>
                    </div>

                    <div className={styles.mobileFooter}>
                      <span
                        className={`${styles.statusBadge} ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                      <span className={slaInfo.status === 'at_risk' ? styles.slaAtRisk : slaInfo.status === 'breached' ? styles.slaBreached : ''}>
                        ⏱ {slaInfo.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
