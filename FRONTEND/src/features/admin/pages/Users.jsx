import { useState } from 'react';
import { adminUsersList } from '../adminMockData';
import styles from './Users.module.css';

export default function Users() {
  const [users, setUsers] = useState(adminUsersList);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'edit' | 'deactivate'
  const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '', status: 'Active' });
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenViewModal = (user) => {
    setSelectedUser(user);
    setModalMode('view');
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
    });
    setModalMode('edit');
  };

  const handleOpenDeactivateModal = (user) => {
    setSelectedUser(user);
    setModalMode('deactivate');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, ...editFormData } : u))
    );
    showToast(`User ${editFormData.name} updated successfully.`);
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleConfirmDeactivate = () => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
          : u
      )
    );
    showToast(
      `User ${selectedUser.name} account ${selectedUser.status === 'Active' ? 'deactivated' : 'activated'}.`
    );
    setModalMode(null);
    setSelectedUser(null);
  };

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
          <h1 className={styles.title}>Customer Accounts</h1>
          <p className={styles.subtitle}>
            Manage customer accounts, inspect ticket creation history, and control portal access.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>452</span>
            <span className={styles.kpiChange}>Registered</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>430</span>
            <span className={styles.kpiChange}>95.1% active</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>New This Month</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#0A84FF' }}>+38</span>
            <span className={styles.kpiChange}>Growth +12%</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Inactive Users</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue} style={{ color: '#FF9F0A' }}>22</span>
            <span className={styles.kpiChange}>Disabled</span>
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

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <div className={styles.tableCard}>
        {filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No user accounts match your search filters.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Total Tickets</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className={styles.userId}>{user.id}</span>
                    </td>
                    <td>
                      <strong className={styles.userName}>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={styles.ticketCountTag}>{user.ticketsCount} tickets</span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          user.status === 'Active' ? styles.activeStatus : styles.inactiveStatus
                        }`}
                      >
                        ● {user.status}
                      </span>
                    </td>
                    <td>{user.joinedDate}</td>
                    <td>
                      <span className={styles.timeText}>{user.lastActive}</span>
                    </td>
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
                            user.status === 'Active' ? styles.deactivateBtn : styles.activateBtn
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
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userProfileHead}>
                <div className={styles.avatarLarge}>{selectedUser.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h4 className={styles.profileName}>{selectedUser.name}</h4>
                  <p className={styles.profileSub}>{selectedUser.email} • {selectedUser.phone}</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span>User ID</span>
                  <strong>{selectedUser.id}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Account Status</span>
                  <strong style={{ color: selectedUser.status === 'Active' ? '#30D158' : '#FF9F0A' }}>
                    {selectedUser.status}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Registration Date</span>
                  <strong>{selectedUser.joinedDate}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Total Tickets Created</span>
                  <strong>{selectedUser.ticketsCount} tickets ({selectedUser.openTickets} currently open)</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Last Active Session</span>
                  <strong>{selectedUser.lastActive}</strong>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.closeModalBtn} onClick={() => setModalMode(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {modalMode === 'edit' && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit User — {selectedUser.name}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={styles.select}
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
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
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirmation Modal (No alert()) */}
      {modalMode === 'deactivate' && selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Confirm Account Status Change</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Are you sure you want to {selectedUser.status === 'Active' ? 'deactivate' : 'activate'} the account for{' '}
                <strong>{selectedUser.name}</strong> ({selectedUser.email})?
              </p>
              {selectedUser.status === 'Active' && (
                <p className={styles.warningText}>
                  Deactivating this user will prevent them from logging in or opening new support tickets.
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setModalMode(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={selectedUser.status === 'Active' ? styles.confirmDeactivateBtn : styles.saveBtn}
                onClick={handleConfirmDeactivate}
              >
                Yes, {selectedUser.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
