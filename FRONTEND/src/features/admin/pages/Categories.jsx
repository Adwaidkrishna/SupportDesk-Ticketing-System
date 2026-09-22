import { useState, useEffect, useCallback } from 'react';
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
} from '../services/adminCategory.service';
import styles from './Categories.module.css';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'toggleStatus'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'Active' });
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch all categories with live ticket counts from backend
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAdminCategories();
      if (response && response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load categories from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setForm({ name: '', description: '', status: 'Active' });
    setModalMode('create');
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      status: cat.status || (cat.isActive ? 'Active' : 'Inactive'),
    });
    setModalMode('edit');
  };

  const handleOpenToggleStatus = (cat) => {
    setSelectedCategory(cat);
    setModalMode('toggleStatus');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createCategory({
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.status === 'Active',
      });
      showToast(`Category "${form.name}" created successfully.`);
      setModalMode(null);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      await updateCategory(selectedCategory.id || selectedCategory._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.status === 'Active',
      });
      showToast(`Category "${form.name}" updated successfully.`);
      setModalMode(null);
      setSelectedCategory(null);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    const targetIsActive = selectedCategory.status === 'Active' ? false : true;
    try {
      await toggleCategoryStatus(
        selectedCategory.id || selectedCategory._id,
        targetIsActive
      );
      showToast(
        `Category "${selectedCategory.name}" ${targetIsActive ? 'activated' : 'deactivated'} successfully.`
      );
      setModalMode(null);
      setSelectedCategory(null);
      await fetchCategories();
    } catch (err) {
      showToast(err.message || 'Failed to update category status.');
    } finally {
      setIsSubmitting(false);
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
          <span className={styles.badgeLabel}>TAXONOMY CONFIGURATION</span>
          <h1 className={styles.title}>Ticket Categories</h1>
          <p className={styles.subtitle}>
            Organize ticket taxonomies, auto-routing rules, and department classification from live database records.
          </p>
        </div>

        <button type="button" className={styles.createBtn} onClick={handleOpenCreate}>
          + Create Category
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.filterCard}>
        <div className={styles.searchBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search categories or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchCategories}>
            Retry
          </button>
        </div>
      )}

      {/* Categories Grid / Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading ticket categories from database...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No ticket categories found.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Total Tickets</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat.id || cat._id}
                    className={`${styles.tableRow} ${
                      cat.status === 'Inactive' ? styles.inactiveRow : ''
                    }`}
                  >
                    <td>
                      <div className={styles.catNameCell}>
                        <span className={styles.catIcon}>📁</span>
                        <strong className={styles.catName}>{cat.name}</strong>
                      </div>
                    </td>
                    <td>
                      <p className={styles.catDesc}>{cat.description}</p>
                    </td>
                    <td>
                      <span className={styles.ticketCountBadge}>
                        {cat.ticketsCount} tickets
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          cat.status === 'Active'
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }`}
                      >
                        ● {cat.status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.dateText}>{cat.createdDate}</span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(cat)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            cat.status === 'Active'
                              ? styles.deactivateBtn
                              : styles.activateBtn
                          }`}
                          onClick={() => handleOpenToggleStatus(cat)}
                        >
                          {cat.status === 'Active' ? 'Deactivate' : 'Activate'}
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

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isSubmitting && setModalMode(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {modalMode === 'create'
                  ? 'Create New Category'
                  : `Edit Category — ${selectedCategory?.name}`}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isSubmitting && setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}
            >
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Category Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Technical Support"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    placeholder="Brief explanation of tickets belonging to this category..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
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
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Category'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirmation Modal */}
      {modalMode === 'toggleStatus' && selectedCategory && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isSubmitting && setModalMode(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {selectedCategory.status === 'Active'
                  ? 'Deactivate Category'
                  : 'Activate Category'}
              </h3>
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
                {selectedCategory.status === 'Active' ? 'deactivate' : 'activate'} category{' '}
                <strong>"{selectedCategory.name}"</strong>?
              </p>
              {selectedCategory.status === 'Active' ? (
                <p className={styles.warningText}>
                  Existing tickets under this category will remain preserved, but customers will no longer be able to select it when opening new tickets.
                </p>
              ) : (
                <p style={{ color: '#30D158', fontSize: '0.85rem' }}>
                  Activating this category will allow customers to select it again when opening new tickets.
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
                  selectedCategory.status === 'Active'
                    ? styles.confirmDeleteBtn
                    : styles.confirmActivateBtn
                }
                onClick={handleConfirmToggleStatus}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Updating...'
                  : selectedCategory.status === 'Active'
                  ? 'Deactivate Category'
                  : 'Activate Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
