import { useState, useEffect, useCallback } from 'react';
import {
  getAdminUsers,
  updateUserStatus,
  updateUserDetails,
} from '../services/adminUser.service';
import Select from '../../../components/common/Select';
import styles from './Users.module.css';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'edit' | 'deactivate'
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'customer',
    phone: '',
    department: 'General Support',
    status: 'Active',
  });
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Live API Fetch with search, status, and role filters
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAdminUsers({
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
      });

      if (response && response.data) {
        setUsers(response.data.users || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve users from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250); // Debounce search input slightly

    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleOpenViewModal = (user) => {
    setSelectedUser(user);
    setModalMode('view');
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'customer',
      phone: user.phone || '',
      department: user.department || 'General Support',
      status: user.status || (user.isActive ? 'Active' : 'Inactive'),
    });
    setModalMode('edit');
  };

  const handleOpenDeactivateModal = (user) => {
    setSelectedUser(user);
    setModalMode('deactivate');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        phone: editFormData.phone.trim(),
        department: editFormData.department.trim(),
        isActive: editFormData.status === 'Active',
      };

      await updateUserDetails(selectedUser.id || selectedUser._id, payload);
      showToast(`User "${editFormData.name}" updated successfully.`);
      setModalMode(null);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    const targetStatus = selectedUser.status === 'Active' ? false : true;
    try {
      await updateUserStatus(selectedUser.id || selectedUser._id, targetStatus);
      showToast(
        `User ${selectedUser.name} account ${targetStatus ? 'activated' : 'deactivated'} successfully.`
      );
      setModalMode(null);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user account status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePercent =
    stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '100.0';

  return (
    <div className={styles.page}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div className={styles.toast}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.badgeLabel}>USER ADMINISTRATION</span>
          <h1 className={styles.title}>User Accounts</h1>
          <p className={styles.subtitle}>
            Manage registered customer, agent, and administrator accounts from live MongoDB records.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary (Real Live Backend Data) */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{stats.total}</span>
            <span className={styles.kpiChange}>Registered</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {stats.active}
            </span>
            <span className={styles.kpiChange}>{activePercent}% active</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>New This Month</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#0A84FF' }}>
              +{stats.newThisMonth}
            </span>
            <span className={styles.kpiChange}>This month</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Inactive Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>
              {stats.inactive}
            </span>
            <span className={styles.kpiChange}>Deactivated</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search users by name, email, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <Select
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'customer', label: 'Customer', badge: 'Customer', badgeColor: '#0A84FF' },
              { value: 'agent', label: 'Agent', badge: 'Agent', badgeColor: '#bf5af2' },
              { value: 'admin', label: 'Admin', badge: 'Admin', badgeColor: '#FFD60A' },
            ]}
            value={roleFilter}
            onChange={setRoleFilter}
          />

          <Select
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Active', label: 'Active', badge: 'Active', badgeColor: '#30D158' },
              { value: 'Inactive', label: 'Inactive', badge: 'Inactive', badgeColor: '#64748B' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchUsers}>
            Retry
          </button>
        </div>
      )}

      {/* Main Users Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading user accounts from database...</p>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No user accounts match your search or filter criteria.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Total Tickets</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id || user._id}>
                    <td>
                      <span className={styles.userId} title={user.id || user._id}>
                        {(user.id || user._id).slice(-8)}
                      </span>
                    </td>
                    <td>
                      <strong className={styles.userName}>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`${styles.roleBadge} ${
                          user.role === 'admin'
                            ? styles.adminRole
                            : user.role === 'agent'
                            ? styles.agentRole
                            : styles.customerRole
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={styles.phoneText}>
                        {user.phone ? user.phone : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.ticketCountTag}>
                        {user.ticketsCount} tickets
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          user.status === 'Active'
                            ? styles.activeStatus
                            : styles.inactiveStatus
                        }`}
                      >
                        ● {user.status}
                      </span>
                    </td>
                    <td>{user.joinedDate}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenViewModal(user)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            user.status === 'Active'
                              ? styles.deactivateBtn
                              : styles.activateBtn
                          }`}
                          onClick={() => handleOpenDeactivateModal(user)}
                        >
                          {user.status === 'Active' ? 'Deactivate' : 'Activate'}
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

      {/* View Details Modal */}
      {modalMode === 'view' && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>User Account Details</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalMode(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userProfileHead}>
                <div className={styles.avatarLarge}>
                  {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className={styles.profileName}>{selectedUser.name}</h4>
                  <p className={styles.profileSub}>
                    {selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ''}
                  </p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span>User ID</span>
                  <strong>{selectedUser.id || selectedUser._id}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>System Role</span>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {selectedUser.role}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Department</span>
                  <strong>{selectedUser.department || 'General Support'}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Account Status</span>
                  <strong
                    style={{
                      color: selectedUser.status === 'Active' ? '#30D158' : '#FF9F0A',
                    }}
                  >
                    {selectedUser.status}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Registration Date</span>
                  <strong>{selectedUser.joinedDate}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Total Tickets Created</span>
                  <strong>
                    {selectedUser.ticketsCount} tickets ({selectedUser.openTickets || 0} currently open)
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Last Updated Session</span>
                  <strong>{selectedUser.lastActive}</strong>
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

      {/* Edit User Modal */}
      {modalMode === 'edit' && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmitting && setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit User — {selectedUser.name}</h3>
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
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Role</label>
                  <select
                    className={styles.select}
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="customer">Customer</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. +1 555-0199"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Department</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Technical Escalations"
                    value={editFormData.department}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, department: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <Select
                  label="Status"
                  options={[
                    { value: 'Active', label: 'Active', badge: 'Active', badgeColor: '#30D158' },
                    { value: 'Inactive', label: 'Inactive', badge: 'Inactive', badgeColor: '#64748B' },
                  ]}
                  value={editFormData.status}
                  onChange={(val) => setEditFormData({ ...editFormData, status: val })}
                  disabled={isSubmitting}
                />
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
                  {isSubmitting ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {modalMode === 'deactivate' && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmitting && setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Confirm Account Status Change</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isSubmitting && setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Are you sure you want to{' '}
                {selectedUser.status === 'Active' ? 'deactivate' : 'activate'} the account for{' '}
                <strong>{selectedUser.name}</strong> ({selectedUser.email})?
              </p>
              {selectedUser.status === 'Active' && (
                <p className={styles.warningText}>
                  Deactivating this user will prevent them from logging in or opening new support tickets.
                </p>
              )}
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
              <button
                type="button"
                className={
                  selectedUser.status === 'Active'
                    ? styles.confirmDeactivateBtn
                    : styles.saveBtn
                }
                onClick={handleConfirmDeactivate}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Updating...'
                  : selectedUser.status === 'Active'
                  ? 'Yes, Deactivate Account'
                  : 'Yes, Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
