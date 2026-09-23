import { useState, useEffect, useCallback } from 'react';
import {
  getAdminSlaPolicies,
  createAdminSlaPolicy,
  updateAdminSlaPolicy,
  toggleAdminSlaPolicyStatus,
} from '../services/adminSla.service';
import styles from './SLA.module.css';

/**
 * Helper to parse human string or raw number into minutes
 */
function parseToMinutes(val) {
  if (typeof val === 'number') return Math.max(1, Math.round(val));
  if (!val) return 60;
  const str = String(val).toLowerCase().trim();
  if (/^\d+$/.test(str)) return Math.max(1, parseInt(str, 10));

  const dayMatch = str.match(/(\d+)\s*(?:day|d)/);
  const hourMatch = str.match(/(\d+)\s*(?:hour|h|hr)/);
  const minMatch = str.match(/(\d+)\s*(?:min|m)/);

  let total = 0;
  if (dayMatch) total += parseInt(dayMatch[1], 10) * 1440;
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) total += parseInt(minMatch[1], 10);

  return total || parseInt(str, 10) || 60;
}

export default function SLA() {
  const [policies, setPolicies] = useState([]);
  const [overview, setOverview] = useState({
    activePolicies: 0,
    atRisk: 0,
    breached: 0,
    withinSLA: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const [form, setForm] = useState({
    policyName: '',
    priority: 'MEDIUM',
    firstResponseTime: '4 hours',
    resolutionTarget: '24 hours',
    warningPercentage: 80,
    businessHours: 'Business Hours (9-6)',
    status: 'Active',
  });

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminSlaPolicies();
      if (res?.data?.data) {
        setPolicies(res.data.data.policies || []);
        if (res.data.data.overview) {
          setOverview(res.data.data.overview);
        }
      }
    } catch (err) {
      console.error('Failed to load SLA policies:', err);
      showToast(err?.response?.data?.message || 'Failed to load SLA policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleOpenCreate = () => {
    setForm({
      policyName: '',
      priority: 'MEDIUM',
      firstResponseTime: '4 hours',
      resolutionTarget: '24 hours',
      warningPercentage: 80,
      businessHours: 'Business Hours (9-6)',
      status: 'Active',
    });
    setModalMode('create');
  };

  const handleOpenEdit = (policy) => {
    setSelectedPolicy(policy);
    setForm({
      policyName: policy.policyName || policy.name,
      priority: policy.priority || 'MEDIUM',
      firstResponseTime: policy.firstResponseTime || `${policy.responseTimeMinutes} min`,
      resolutionTarget: policy.resolutionTarget || `${policy.resolutionTimeMinutes} min`,
      warningPercentage: policy.warningPercentage || 80,
      businessHours: policy.businessHours || 'Business Hours (9-6)',
      status: policy.status || (policy.isActive ? 'Active' : 'Inactive'),
    });
    setModalMode('edit');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.policyName.trim(),
        priority: form.priority,
        responseTimeMinutes: parseToMinutes(form.firstResponseTime),
        resolutionTimeMinutes: parseToMinutes(form.resolutionTarget),
        warningPercentage: parseInt(form.warningPercentage, 10) || 80,
        businessHours: form.businessHours,
        isActive: form.status === 'Active',
      };

      await createAdminSlaPolicy(payload);
      showToast(`SLA Policy "${form.policyName}" created successfully.`);
      setModalMode(null);
      await loadPolicies();
    } catch (err) {
      console.error('Failed to create policy:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to create policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPolicy || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.policyName.trim(),
        priority: form.priority,
        responseTimeMinutes: parseToMinutes(form.firstResponseTime),
        resolutionTimeMinutes: parseToMinutes(form.resolutionTarget),
        warningPercentage: parseInt(form.warningPercentage, 10) || 80,
        businessHours: form.businessHours,
        isActive: form.status === 'Active',
      };

      await updateAdminSlaPolicy(selectedPolicy.id || selectedPolicy._id, payload);
      showToast(`SLA Policy "${form.policyName}" updated successfully.`);
      setModalMode(null);
      setSelectedPolicy(null);
      await loadPolicies();
    } catch (err) {
      console.error('Failed to update policy:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to update policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (policy) => {
    try {
      const newStatus = !policy.isActive;
      await toggleAdminSlaPolicyStatus(policy.id || policy._id, newStatus);
      showToast(`Policy "${policy.policyName}" is now ${newStatus ? 'Active' : 'Inactive'}.`);
      await loadPolicies();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to update status.');
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
            <span className={styles.kpiValue}>{overview.activePolicies}</span>
            <span className={styles.kpiSub}>Configured</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>SLA At Risk</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>
              {overview.atRisk}
            </span>
            <span className={styles.kpiSub}>⚠️ Approaching breach</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Breached Tickets</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF453A' }}>
              {overview.breached}
            </span>
            <span className={styles.kpiSub}>🚫 Target exceeded</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Within SLA</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {overview.withinSLA}
            </span>
            <span className={styles.kpiSub}>Compliant tickets</span>
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
              {loading && policies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    Loading SLA policies from database...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    No SLA policies found. Click "+ Create SLA Policy" to configure your first policy.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id || p._id}>
                    <td>
                      <strong className={styles.policyName}>{p.policyName || p.name}</strong>
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
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Click to toggle status"
                      >
                        <span
                          className={`${styles.statusBadge} ${
                            p.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
                          }`}
                        >
                          ● {p.status}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className={styles.monitoredPill}>
                        <span className={styles.withinText}>Within: {p.withinSLA || 0}</span>
                        {(p.atRisk > 0 || overview.atRisk > 0) && (
                          <span className={styles.atRiskText}>Risk: {p.atRisk || 0}</span>
                        )}
                        {(p.breached > 0 || overview.breached > 0) && (
                          <span className={styles.breachedText}>Breached: {p.breached || 0}</span>
                        )}
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
                ))
              )}
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
                    placeholder="e.g. Urgent Priority SLA"
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
                    <option value="URGENT">URGENT (Critical Outage)</option>
                    <option value="HIGH">HIGH (High Severity)</option>
                    <option value="MEDIUM">MEDIUM (Standard Support)</option>
                    <option value="LOW">LOW (Minor Inquiry)</option>
                  </select>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>First Response Target</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 30 min or 4 hours"
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
                      placeholder="e.g. 4 hours or 24 hours"
                      value={form.resolutionTarget}
                      onChange={(e) => setForm({ ...form, resolutionTarget: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Warning Threshold (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      className={styles.input}
                      placeholder="e.g. 80"
                      value={form.warningPercentage}
                      onChange={(e) => setForm({ ...form, warningPercentage: e.target.value })}
                      required
                    />
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
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Policy'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
