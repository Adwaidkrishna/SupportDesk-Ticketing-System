import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminTickets,
  assignTicketAgent,
  updateTicketStatus,
  updateTicketPriority,
} from '../services/adminTicket.service';
import { getAdminAgents } from '../services/adminAgent.service';
import { getAdminCategories } from '../services/adminCategory.service';
import Select from '../../../components/common/Select';
import styles from './AdminTickets.module.css';

export default function AdminTickets() {
  const navigate = useNavigate();

  // Data state
  const [tickets, setTickets] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Modal State for Quick Actions
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionModalType, setActionModalType] = useState(null); // 'reassign' | 'priority' | 'status'
  const [modalValue, setModalValue] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch initial dropdown references (agents & categories)
  useEffect(() => {
    let isMounted = true;

    async function fetchDropdownData() {
      try {
        const [agentsRes, catsRes] = await Promise.all([
          getAdminAgents().catch(() => null),
          getAdminCategories().catch(() => null),
        ]);

        if (isMounted) {
          if (agentsRes?.data?.agents) {
            setAgentsList(agentsRes.data.agents);
          }
          if (catsRes?.data?.categories) {
            setCategoriesList(catsRes.data.categories);
          }
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }

    fetchDropdownData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets from backend with query parameters
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        limit: 100,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      if (agentFilter !== 'all') params.agentId = agentFilter;

      const response = await getAdminTickets(params);
      const data = response?.data?.tickets || [];
      setTickets(data);
    } catch (err) {
      console.error('Failed to load admin tickets:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, agentFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenActionModal = (ticket, type) => {
    setSelectedTicket(ticket);
    setActionModalType(type);
    if (type === 'reassign') {
      const currentAgentId = ticket.assignedTo?._id || ticket.assignedTo?.id || 'unassigned';
      setModalValue(currentAgentId);
    }
    if (type === 'priority') setModalValue(ticket.priority || 'MEDIUM');
    if (type === 'status') setModalValue(ticket.status || 'OPEN');
  };

  const handleSaveModalAction = async () => {
    if (!selectedTicket || modalSubmitting) return;

    setModalSubmitting(true);
    try {
      const ticketId = selectedTicket.ticketNumber || selectedTicket.id || selectedTicket._id;

      if (actionModalType === 'reassign') {
        const targetAgentId = modalValue === 'unassigned' || !modalValue ? null : modalValue;
        const res = await assignTicketAgent(ticketId, targetAgentId);
        const updatedTicket = res?.data?.ticket;

        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updatedTicket } : t))
        );
        showToast(`Ticket #${ticketId} reassigned successfully.`);
      } else if (actionModalType === 'priority') {
        const res = await updateTicketPriority(ticketId, modalValue);
        const updatedTicket = res?.data?.ticket;

        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updatedTicket } : t))
        );
        showToast(`Ticket #${ticketId} priority updated to ${modalValue}.`);
      } else if (actionModalType === 'status') {
        const res = await updateTicketStatus(ticketId, modalValue);
        const updatedTicket = res?.data?.ticket;

        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updatedTicket } : t))
        );
        showToast(`Ticket #${ticketId} status updated to ${modalValue}.`);
      }

      setActionModalType(null);
      setSelectedTicket(null);
    } catch (err) {
      console.error('Failed to update ticket:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to update ticket.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const formatTicketDate = (dateVal) => {
    if (!dateVal) return 'Recently';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.page}>
      {/* Feedback Toast */}
      {toastMsg && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>TICKET MANAGEMENT</span>
          <h1 className={styles.title}>All Support Tickets</h1>
          <p className={styles.subtitle}>
            Monitor, inspect, reassign, and manage all customer tickets across the organization.
          </p>
        </div>
      </div>

      {/* Search & Multi-Filters Toolbar */}
      <div className={styles.filterCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tickets, customers, agents, or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <span className={styles.countBadge}>{tickets.length} Tickets Found</span>
        </div>

        <div className={styles.filtersGrid}>
          {/* Status Filter */}
          <Select
            label="Status"
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'OPEN', label: 'Open', badge: 'Open', badgeColor: '#0A84FF' },
              { value: 'IN_PROGRESS', label: 'In Progress', badge: 'Active', badgeColor: '#FFD60A' },
              { value: 'RESOLVED', label: 'Resolved', badge: 'Resolved', badgeColor: '#30D158' },
              { value: 'CLOSED', label: 'Closed', badge: 'Closed', badgeColor: '#64748B' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />

          {/* Priority Filter */}
          <Select
            label="Priority"
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

          {/* Category Filter */}
          <Select
            label="Category"
            options={[
              { value: 'all', label: 'All Categories' },
              ...categoriesList.map((cat) => ({
                value: cat.id || cat._id,
                label: cat.name,
              })),
            ]}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />

          {/* Agent Filter */}
          <Select
            label="Assigned Agent"
            options={[
              { value: 'all', label: 'All Agents' },
              { value: 'unassigned', label: 'Unassigned', initials: 'UN' },
              ...agentsList.map((a) => ({
                value: a.id || a._id,
                label: a.name,
                subtitle: a.department,
                initials: a.name ? a.name.split(' ').map((n) => n[0]).join('') : 'AG',
              })),
            ]}
            value={agentFilter}
            onChange={setAgentFilter}
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Main Table / Mobile Cards / Loading */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading tickets from database...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No matching tickets</h3>
            <p className={styles.emptyDesc}>Try adjusting your search query or clear select filters.</p>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setAgentFilter('all');
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={styles.desktopTableWrapper}>
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
                    <th>Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const ticketIdStr = t.ticketNumber || t.id || t._id;
                    const priorityLower = (t.priority || 'medium').toLowerCase();
                    const statusVal = t.status || 'OPEN';

                    return (
                      <tr key={t.id || t._id} className={styles.tableRow}>
                        <td>
                          <span
                            className={styles.ticketId}
                            onClick={() => navigate(`/admin/tickets/${ticketIdStr}`)}
                          >
                            #{ticketIdStr}
                          </span>
                        </td>
                        <td>
                          <strong
                            className={styles.subjectText}
                            onClick={() => navigate(`/admin/tickets/${ticketIdStr}`)}
                          >
                            {t.subject}
                          </strong>
                        </td>
                        <td>
                          <div className={styles.metaCell}>
                            <span>{t.customer?.name || 'Customer'}</span>
                            <small className={styles.subText}>{t.customer?.email || 'N/A'}</small>
                          </div>
                        </td>
                        <td>
                          <span className={styles.agentTag}>
                            {t.assignedTo?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.categoryPill}>
                            {t.category?.name || 'General'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.priorityBadge} ${styles[priorityLower] || ''}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <span className={styles.statusPill}>{statusVal}</span>
                        </td>
                        <td>
                          <span className={styles.timeText}>{formatTicketDate(t.updatedAt || t.createdAt)}</span>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              title="Reassign Agent"
                              onClick={() => handleOpenActionModal(t, 'reassign')}
                            >
                              👤
                            </button>
                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              title="Change Priority"
                              onClick={() => handleOpenActionModal(t, 'priority')}
                            >
                              ⚡
                            </button>
                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              title="Change Status"
                              onClick={() => handleOpenActionModal(t, 'status')}
                            >
                              ⚙️
                            </button>
                            <button
                              type="button"
                              className={styles.viewBtn}
                              onClick={() => navigate(`/admin/tickets/${ticketIdStr}`)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List (<768px) */}
            <div className={styles.mobileCardsList}>
              {tickets.map((t) => {
                const ticketIdStr = t.ticketNumber || t.id || t._id;
                const priorityLower = (t.priority || 'medium').toLowerCase();

                return (
                  <div
                    key={t.id || t._id}
                    className={styles.mobileCard}
                    onClick={() => navigate(`/admin/tickets/${ticketIdStr}`)}
                  >
                    <div className={styles.mobileCardHeader}>
                      <span className={styles.ticketId}>#{ticketIdStr}</span>
                      <span className={`${styles.priorityBadge} ${styles[priorityLower] || ''}`}>
                        {t.priority}
                      </span>
                    </div>
                    <h4 className={styles.mobileSubject}>{t.subject}</h4>
                    <div className={styles.mobileMetaRow}>
                      <span>Customer: <strong>{t.customer?.name || 'Customer'}</strong></span>
                      <span>Agent: <strong>{t.assignedTo?.name || 'Unassigned'}</strong></span>
                    </div>
                    <div className={styles.mobileFooter}>
                      <span className={styles.statusPill}>{t.status}</span>
                      <span className={styles.timeText}>{formatTicketDate(t.updatedAt || t.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Quick Action Modal */}
      {actionModalType && selectedTicket && (
        <div className={styles.modalBackdrop} onClick={() => setActionModalType(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {actionModalType === 'reassign' && `Reassign Ticket #${selectedTicket.ticketNumber || selectedTicket.id}`}
                {actionModalType === 'priority' && `Change Priority — #${selectedTicket.ticketNumber || selectedTicket.id}`}
                {actionModalType === 'status' && `Update Status — #${selectedTicket.ticketNumber || selectedTicket.id}`}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActionModalType(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalSubject}>{selectedTicket.subject}</p>

              {actionModalType === 'reassign' && (
                <div className={styles.formGroup}>
                  <label>Select Agent</label>
                  <select
                    className={styles.modalSelect}
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                  >
                    <option value="unassigned">Unassigned</option>
                    {agentsList.map((a) => (
                      <option key={a.id || a._id} value={a.id || a._id}>
                        {a.name} ({a.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actionModalType === 'priority' && (
                <div className={styles.formGroup}>
                  <label>Select Priority Level</label>
                  <select
                    className={styles.modalSelect}
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                  >
                    <option value="URGENT">Urgent (Critical)</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              )}

              {actionModalType === 'status' && (
                <div className={styles.formGroup}>
                  <label>Select Ticket Status</label>
                  <select
                    className={styles.modalSelect}
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActionModalType(null)}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveModalAction}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
