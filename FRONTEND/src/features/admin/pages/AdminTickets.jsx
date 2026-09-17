import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAllTickets, adminAgentsList } from '../adminMockData';
import Select from '../../../components/common/Select';
import styles from './AdminTickets.module.css';

export default function AdminTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState(adminAllTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  // Modal State for Quick Actions
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionModalType, setActionModalType] = useState(null); // 'reassign' | 'priority' | 'status'
  const [modalValue, setModalValue] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter Logic
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.agent.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesAgent = agentFilter === 'all' || t.agent === agentFilter;

    let matchesSla = true;
    if (slaFilter === 'at_risk') matchesSla = t.sla.toLowerCase().includes('risk');
    if (slaFilter === 'breached') matchesSla = t.sla.toLowerCase().includes('breached');
    if (slaFilter === 'within') matchesSla = !t.sla.toLowerCase().includes('risk') && !t.sla.toLowerCase().includes('breached');

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAgent && matchesSla;
  });

  const handleOpenActionModal = (ticket, type) => {
    setSelectedTicket(ticket);
    setActionModalType(type);
    if (type === 'reassign') setModalValue(ticket.agent);
    if (type === 'priority') setModalValue(ticket.priority);
    if (type === 'status') setModalValue(ticket.status);
  };

  const handleSaveModalAction = () => {
    if (!selectedTicket) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicket.id) {
          if (actionModalType === 'reassign') return { ...t, agent: modalValue, updated: 'Just now' };
          if (actionModalType === 'priority') return { ...t, priority: modalValue, updated: 'Just now' };
          if (actionModalType === 'status') return { ...t, status: modalValue, updated: 'Just now' };
        }
        return t;
      })
    );

    showToast(`Ticket ${selectedTicket.id} updated successfully!`);
    setActionModalType(null);
    setSelectedTicket(null);
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
          <span className={styles.countBadge}>{filteredTickets.length} Tickets Found</span>
        </div>

        <div className={styles.filtersGrid}>
          {/* Status Filter */}
          <Select
            label="Status"
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Open', label: 'Open', badge: 'Open', badgeColor: '#0A84FF' },
              { value: 'In Progress', label: 'In Progress', badge: 'Active', badgeColor: '#FFD60A' },
              { value: 'Waiting for Customer', label: 'Waiting for Customer', badge: 'Waiting', badgeColor: '#FF9F0A' },
              { value: 'Resolved', label: 'Resolved', badge: 'Resolved', badgeColor: '#30D158' },
              { value: 'Closed', label: 'Closed', badge: 'Closed', badgeColor: '#64748B' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />

          {/* Priority Filter */}
          <Select
            label="Priority"
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'Critical', label: 'Critical', badge: 'P1', badgeColor: '#FF453A' },
              { value: 'High', label: 'High', badge: 'P2', badgeColor: '#FF9F0A' },
              { value: 'Medium', label: 'Medium', badge: 'P3', badgeColor: '#64D2FF' },
              { value: 'Low', label: 'Low', badge: 'P4', badgeColor: '#94A3B8' },
            ]}
            value={priorityFilter}
            onChange={setPriorityFilter}
          />

          {/* Category Filter */}
          <Select
            label="Category"
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'Account & Billing', label: 'Account & Billing' },
              { value: 'Infrastructure', label: 'Infrastructure' },
              { value: 'Integrations', label: 'Integrations' },
              { value: 'Security', label: 'Security' },
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
              ...adminAgentsList.map((a) => ({
                value: a.name,
                label: a.name,
                subtitle: a.department,
                initials: a.initials || a.name.split(' ').map((n) => n[0]).join(''),
              })),
            ]}
            value={agentFilter}
            onChange={setAgentFilter}
          />

          {/* SLA Status Filter */}
          <Select
            label="SLA Status"
            options={[
              { value: 'all', label: 'All SLA Statuses' },
              { value: 'within', label: 'Within SLA', badge: 'OK', badgeColor: '#30D158' },
              { value: 'risk', label: 'At Risk', badge: 'Risk', badgeColor: '#FF9F0A' },
              { value: 'breached', label: 'Breached', badge: 'Breached', badgeColor: '#FF453A' },
            ]}
            value={slaFilter}
            onChange={setSlaFilter}
          />
        </div>
      </div>

      {/* Main Table / Mobile Cards */}
      <div className={styles.tableCard}>
        {filteredTickets.length === 0 ? (
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
                setSlaFilter('all');
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
                    <th>SLA Target</th>
                    <th>Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className={styles.tableRow}>
                      <td>
                        <span
                          className={styles.ticketId}
                          onClick={() => navigate(`/admin/tickets/${t.id.replace('#', '')}`)}
                        >
                          {t.id}
                        </span>
                      </td>
                      <td>
                        <strong
                          className={styles.subjectText}
                          onClick={() => navigate(`/admin/tickets/${t.id.replace('#', '')}`)}
                        >
                          {t.subject}
                        </strong>
                      </td>
                      <td>
                        <div className={styles.metaCell}>
                          <span>{t.customer}</span>
                          <small className={styles.subText}>{t.customerEmail}</small>
                        </div>
                      </td>
                      <td>
                        <span className={styles.agentTag}>{t.agent}</span>
                      </td>
                      <td>
                        <span className={styles.categoryPill}>{t.category}</span>
                      </td>
                      <td>
                        <span className={`${styles.priorityBadge} ${styles[t.priority.toLowerCase()]}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusPill}>{t.status}</span>
                      </td>
                      <td>
                        <span
                          className={`${styles.slaBadge} ${
                            t.sla.toLowerCase().includes('breached')
                              ? styles.slaBreached
                              : t.sla.toLowerCase().includes('risk')
                              ? styles.slaRisk
                              : ''
                          }`}
                        >
                          {t.sla}
                        </span>
                      </td>
                      <td>
                        <span className={styles.timeText}>{t.updated}</span>
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
                            onClick={() => navigate(`/admin/tickets/${t.id.replace('#', '')}`)}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List (<768px) */}
            <div className={styles.mobileCardsList}>
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className={styles.mobileCard}
                  onClick={() => navigate(`/admin/tickets/${t.id.replace('#', '')}`)}
                >
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.ticketId}>{t.id}</span>
                    <span className={`${styles.priorityBadge} ${styles[t.priority.toLowerCase()]}`}>
                      {t.priority}
                    </span>
                  </div>
                  <h4 className={styles.mobileSubject}>{t.subject}</h4>
                  <div className={styles.mobileMetaRow}>
                    <span>Customer: <strong>{t.customer}</strong></span>
                    <span>Agent: <strong>{t.agent}</strong></span>
                  </div>
                  <div className={styles.mobileFooter}>
                    <span className={styles.statusPill}>{t.status}</span>
                    <span className={styles.slaBadge}>{t.sla}</span>
                    <span className={styles.timeText}>{t.updated}</span>
                  </div>
                </div>
              ))}
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
                {actionModalType === 'reassign' && `Reassign Ticket ${selectedTicket.id}`}
                {actionModalType === 'priority' && `Change Priority — ${selectedTicket.id}`}
                {actionModalType === 'status' && `Update Status — ${selectedTicket.id}`}
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
                    <option value="Unassigned">Unassigned</option>
                    {adminAgentsList.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({a.department})
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
                    <option value="Critical">Critical (15m SLA)</option>
                    <option value="High">High (1h SLA)</option>
                    <option value="Medium">Medium (4h SLA)</option>
                    <option value="Low">Low (8h SLA)</option>
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
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Waiting for Customer</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActionModalType(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveModalAction}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
