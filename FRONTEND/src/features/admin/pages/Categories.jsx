import { useState } from 'react';
import { adminCategoriesList } from '../adminMockData';
import styles from './Categories.module.css';

export default function Categories() {
  const [categories, setCategories] = useState(adminCategoriesList);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'Active', icon: 'wrench' });
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setForm({ name: '', description: '', status: 'Active', icon: 'wrench' });
    setModalMode('create');
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      status: cat.status,
      icon: cat.icon || 'wrench',
    });
    setModalMode('edit');
  };

  const handleOpenDelete = (cat) => {
    setSelectedCategory(cat);
    setModalMode('delete');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newCat = {
      id: `cat_${Date.now()}`,
      name: form.name,
      description: form.description,
      ticketsCount: 0,
      status: form.status,
      createdDate: 'Today',
      icon: form.icon,
    };
    setCategories([newCat, ...categories]);
    showToast(`Category "${form.name}" created successfully.`);
    setModalMode(null);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setCategories((prev) =>
      prev.map((c) => (c.id === selectedCategory.id ? { ...c, ...form } : c))
    );
    showToast(`Category "${form.name}" updated.`);
    setModalMode(null);
    setSelectedCategory(null);
  };

  const handleConfirmDelete = () => {
    setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
    showToast(`Category "${selectedCategory.name}" removed.`);
    setModalMode(null);
    setSelectedCategory(null);
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
            Organize ticket taxonomies, auto-routing rules, and department classification.
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

      {/* Categories Grid / Table */}
      <div className={styles.tableCard}>
        {filteredCategories.length === 0 ? (
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
                    key={cat.id}
                    className={`${styles.tableRow} ${cat.status === 'Inactive' ? styles.inactiveRow : ''}`}
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
                      <span className={styles.ticketCountBadge}>{cat.ticketsCount} tickets</span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          cat.status === 'Active' ? styles.activeBadge : styles.inactiveBadge
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
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleOpenDelete(cat)}
                        >
                          Delete
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
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{modalMode === 'create' ? 'Create New Category' : `Edit Category — ${selectedCategory?.name}`}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>

            <form onSubmit={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}>
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

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn}>
                  {modalMode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedCategory && (
        <div className={styles.modalBackdrop} onClick={() => setModalMode(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Delete Category</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setModalMode(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Are you sure you want to delete category <strong>"{selectedCategory.name}"</strong>?
              </p>
              <p className={styles.warningText}>
                Existing tickets under this category will remain, but customers will no longer be able to select it when opening new tickets.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setModalMode(null)}>
                Cancel
              </button>
              <button type="button" className={styles.confirmDeleteBtn} onClick={handleConfirmDelete}>
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
