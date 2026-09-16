import { useState } from 'react';
import { adminSlaPoliciesList } from '../adminMockData';
import styles from './SLA.module.css';

export default function SLA() {
  const [policies, setPolicies] = useState(adminSlaPoliciesList);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [form, setForm] = useState({
    policyName: '',
    priority: 'Medium',
    firstResponseTime: '4 hours',
    resolutionTarget: '24 hours',
    businessHours: 'Business Hours (9-6)',
    status: 'Active',
  });

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenCreate = () => {
    setForm({
      policyName: '',
      priority: 'Medium',
      firstResponseTime: '4 hours',
      resolutionTarget: '24 hours',
      businessHours: 'Business Hours (9-6)',
      status: 'Active',
    });
    setModalMode('create');
  };

  const handleOpenEdit = (policy) => {
    setSelectedPolicy(policy);
    setForm({
      policyName: policy.policyName,
      priority: policy.priority,
      firstResponseTime: policy.firstResponseTime,
      resolutionTarget: policy.resolutionTarget,
      businessHours: policy.businessHours,
      status: policy.status,
    });
    setModalMode('edit');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newPolicy = {
      id: `sla_${Date.now()}`,
      policyName: form.policyName,
      priority: form.priority,
      firstResponseTime: form.firstResponseTime,
      resolutionTarget: form.resolutionTarget,
      businessHours: form.businessHours,
      status: form.status,
      withinSLA: 0,
      atRisk: 0,
      breached: 0,
    };
    setPolicies([newPolicy, ...policies]);
    showToast(`SLA Policy "${form.policyName}" created successfully.`);
    setModalMode(null);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setPolicies((prev) =>
      prev.map((p) => (p.id === selectedPolicy.id ? { ...p, ...form } : p))
    );
    showToast(`SLA Policy "${form.policyName}" updated.`);
    setModalMode(null);
    setSelectedPolicy(null);
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
          <span className={styles.badgeLabel}>SERVICE LEVEL AGREEMENTS</span>
          <h1 className={styles.title}>SLA Management</h1>
          <p className={styles.subtitle}>
            Configure response/resolution target thresholds, business coverage schedules, and monitor compliance.
          </p>
        </div>

        <button type="button" className={styles.createBtn} onClick={handleOpenCreate}>
          + Create SLA Policy
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Policies</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{policies.filter((p) => p.status === 'Active').length}</span>
            <span className={styles.kpiSub}>Configured</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>SLA At Risk</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>18</span>
            <span className={styles.kpiSub}>⚠️ Approaching breach</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Breached Today</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF453A' }}>7</span>
            <span className={styles.kpiSub}>🚫 Target exceeded</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg First Response</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>24 min</span>
            <span className={styles.kpiSub}>Target: &lt; 30 min</span>
          </div>
        </div>
      </div>

      {/* SLA Policy Table */}
      <div className={styles.tableCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Configured Response Targets</h3>
          <span className={styles.countBadge}>{policies.length} Policies</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Policy Name</th>
                <th>Priority Target</th>
                <th>First Response</th>
                <th>Resolution Target</th>
                <th>Business Hours</th>
                <th>Status</th>
                <th>Monitored Tickets</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong className={styles.policyName}>{p.policyName}</strong>
                  </td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[p.priority.toLowerCase()]}`}>
                      {p.priority}
                    </span>
                  </td>
                  <td>
                    <span className={styles.timeTag}>⏱️ {p.firstResponseTime}</span>
                  </td>
                  <td>
                    <span className={styles.timeTag}>🎯 {p.resolutionTarget}</span>
                  </td>
                  <td>
                    <span className={styles.hoursTag}>{p.businessHours}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        p.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
                      }`}
                    >
                      ● {p.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.monitoredPill}>
                      <span className={styles.withinText}>Within: {p.withinSLA}</span>
                      {p.atRisk > 0 && <span className={styles.atRiskText}>Risk: {p.atRisk}</span>}
                      {p.breached > 0 && <span className={styles.breachedText}>Breached: {p.breached}</span>}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenEdit(p)}
                      >
                        Edit Policy
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit SLA Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{modalMode === 'create' ? 'Create SLA Policy' : `Edit Policy — ${selectedPolicy?.policyName}`}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>

            <form onSubmit={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Policy Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Executive Support SLA"
                    value={form.policyName}
                    onChange={(e) => setForm({ ...form, policyName: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Priority Level</label>
                  <select
                    className={styles.select}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>First Response Target</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 15 min or 1 hour"
                      value={form.firstResponseTime}
                      onChange={(e) => setForm({ ...form, firstResponseTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Resolution Time Target</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 2 hours or 24 hours"
                      value={form.resolutionTarget}
                      onChange={(e) => setForm({ ...form, resolutionTarget: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Business Coverage Schedule</label>
                  <select
                    className={styles.select}
                    value={form.businessHours}
                    onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                  >
                    <option value="24/7 Coverage">24/7 Coverage</option>
                    <option value="Business Hours (9-6)">Business Hours (9 AM - 6 PM)</option>
                    <option value="Extended Hours (8-10)">Extended Hours (8 AM - 10 PM)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn}>
                  {modalMode === 'create' ? 'Create Policy' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
