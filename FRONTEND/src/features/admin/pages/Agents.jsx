import { useState, useEffect, useCallback } from 'react';
import {
  getAdminAgents,
  updateAgentStatus,
  updateAgentDetails,
} from '../services/adminAgent.service';
import styles from './Agents.module.css';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    busy: 0,
    away: 0,
    offline: 0,
    awayOffline: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'edit'
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'agent',
    department: 'General Support',
    status: 'Available',
  });
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch agents and live workload metrics from backend API
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAdminAgents({
        search: searchTerm,
        status: statusFilter,
      });

      if (response && response.data) {
        setAgents(response.data.agents || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load support agents from server.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAgents();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchAgents]);

  const handleOpenView = (agent) => {
    setSelectedAgent(agent);
    setModalMode('view');
  };

  const handleOpenEdit = (agent) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.name || '',
      email: agent.email || '',
      role: agent.role || 'agent',
      department: agent.department || 'General Support',
      status: agent.status || agent.availability || 'Available',
    });
    setModalMode('edit');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        department: editForm.department.trim(),
        status: editForm.status,
      };

      await updateAgentDetails(selectedAgent.id || selectedAgent._id, payload);
      showToast(`Agent profile for ${editForm.name} updated.`);
      setModalMode(null);
      setSelectedAgent(null);
      await fetchAgents();
    } catch (err) {
      showToast(err.message || 'Failed to update agent profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (agentId, newStatus) => {
    try {
      await updateAgentStatus(agentId, newStatus);
      showToast(`Agent status updated to ${newStatus}`);
      await fetchAgents();
    } catch (err) {
      showToast(err.message || 'Failed to update agent availability.');
    }
  };

  return (
    <div className={styles.page}>
      {/* Toast */}
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
          <span className={styles.badgeLabel}>TEAM OPERATIONS</span>
          <h1 className={styles.title}>Support Agents</h1>
          <p className={styles.subtitle}>
            Monitor agent workload, availability status, SLA compliance, and team assignments from live MongoDB records.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary (API-driven live stats) */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Agents</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{stats.total}</span>
            <span className={styles.kpiChange}>Support staff</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Available (Online)</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {stats.available}
            </span>
            <span className={styles.kpiChange}>🟢 Ready for tickets</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Busy / Active Call</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FFD60A' }}>
              {stats.busy}
            </span>
            <span className={styles.kpiChange}>🔴 Handling tickets</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Away / Offline</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#9ca3af' }}>
              {stats.awayOffline}
            </span>
            <span className={styles.kpiChange}>⚪ Off shift</span>
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className={styles.filterCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search agents by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Availability States</option>
              <option value="Available">🟢 Available</option>
              <option value="Busy">🔴 Busy</option>
              <option value="Away">🟡 Away</option>
              <option value="Offline">⚪ Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchAgents}>
            Retry
          </button>
        </div>
      )}

      {/* Operational Agent Table (Live MongoDB Workload) */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading support agents and workload metrics from database...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No agents match your search criteria.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Department</th>
                  <th>Availability</th>
                  <th>Assigned Queue</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>SLA Compliance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id || agent._id}>
                    <td>
                      <div className={styles.agentCell}>
                        <div className={styles.avatar}>
                          {agent.name ? agent.name.slice(0, 2).toUpperCase() : 'AG'}
                        </div>
                        <div>
                          <strong className={styles.agentName}>{agent.name}</strong>
                          <span className={styles.agentEmail}>{agent.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.deptTag}>{agent.department}</span>
                    </td>
                    <td>
                      <select
                        className={`${styles.statusSelect} ${styles[agent.status.toLowerCase()] || ''}`}
                        value={agent.status}
                        onChange={(e) =>
                          handleQuickStatusChange(agent.id || agent._id, e.target.value)
                        }
                      >
                        <option value="Available">🟢 Available</option>
                        <option value="Busy">🔴 Busy</option>
                        <option value="Away">🟡 Away</option>
                        <option value="Offline">⚪ Offline</option>
                      </select>
                    </td>
                    <td>{agent.assigned} tickets</td>
                    <td>{agent.inProgress} active</td>
                    <td>{agent.resolved} resolved</td>
                    <td>
                      <strong className={styles.slaText}>{agent.sla}</strong>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenView(agent)}
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(agent)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Agent Profile Modal */}
      {modalMode === 'view' && selectedAgent && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Agent Operational Profile</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.agentProfileHead}>
                <div className={styles.avatarLarge}>
                  {selectedAgent.name ? selectedAgent.name.slice(0, 2).toUpperCase() : 'AG'}
                </div>
                <div>
                  <h4 className={styles.profileName}>{selectedAgent.name}</h4>
                  <p className={styles.profileSub}>
                    {selectedAgent.role} • {selectedAgent.department}
                  </p>
                  <p className={styles.profileEmail}>{selectedAgent.email}</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span>Current Availability</span>
                  <strong
                    style={{
                      color: selectedAgent.status === 'Available' ? '#30D158' : '#FFD60A',
                    }}
                  >
                    ● {selectedAgent.status}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Assigned Workload (Active)</span>
                  <strong>{selectedAgent.assigned} active tickets</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Tickets In Progress</span>
                  <strong>{selectedAgent.inProgress} tickets</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Resolved Tickets</span>
                  <strong>{selectedAgent.resolved} completed</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Closed Tickets</span>
                  <strong>{selectedAgent.closed} closed</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Total Assigned (All-time)</span>
                  <strong>{selectedAgent.totalAssigned} tickets</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>SLA Compliance Rate</span>
                  <strong style={{ color: '#30D158' }}>{selectedAgent.sla}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Team Onboarding Date</span>
                  <strong>{selectedAgent.joinedDate}</strong>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setModalMode(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {modalMode === 'edit' && selectedAgent && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmitting && setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Support Agent Details</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isSubmitting && setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Department</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({ ...editForm, department: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Role</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Availability Status</label>
                  <select
                    className={styles.select}
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Away">Away</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setModalMode(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Agent Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
