import { useState, useEffect, useCallback } from 'react';
import {
  getKnowledgeArticles,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
} from '../../customer/services/knowledgeBase.service';
import styles from './KnowledgeBase.module.css';

const KB_CATEGORIES = [
  'Getting Started',
  'Account & Security',
  'Billing & Plans',
  'Troubleshooting',
  'API & Integrations',
  'General',
];

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'Getting Started',
    content: '',
    status: 'DRAFT',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getKnowledgeArticles({
        search: searchTerm,
        category: categoryFilter === 'ALL' ? '' : categoryFilter,
        status: statusFilter === 'ALL' ? '' : statusFilter,
      });

      if (res?.data?.articles) {
        setArticles(res.data.articles);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchArticles]);

  const handleOpenCreate = () => {
    setForm({
      title: '',
      category: 'Getting Started',
      content: '',
      status: 'DRAFT',
    });
    setSelectedArticle(null);
    setModalMode('create');
  };

  const handleOpenEdit = (article) => {
    setSelectedArticle(article);
    setForm({
      title: article.title,
      category: article.category,
      content: article.content,
      status: article.status || 'DRAFT',
    });
    setModalMode('edit');
  };

  const handleOpenDelete = (article) => {
    setSelectedArticle(article);
    setModalMode('delete');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Title and content are required.');
      return;
    }

    try {
      setSaving(true);
      await createKnowledgeArticle(form);
      showToast(`Article "${form.title}" created successfully.`);
      setModalMode(null);
      fetchArticles();
    } catch (err) {
      showToast(err.message || 'Error creating article.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Title and content are required.');
      return;
    }

    try {
      setSaving(true);
      const articleId = selectedArticle._id || selectedArticle.id;
      await updateKnowledgeArticle(articleId, form);
      showToast(`Article "${form.title}" updated successfully.`);
      setModalMode(null);
      setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      showToast(err.message || 'Error updating article.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (article) => {
    const articleId = article._id || article.id;
    const nextStatus = article.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    try {
      await updateKnowledgeArticle(articleId, { status: nextStatus });
      showToast(`Article is now ${nextStatus === 'PUBLISHED' ? 'Published' : 'in Draft'}.`);
      fetchArticles();
    } catch (err) {
      showToast(err.message || 'Error toggling article status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedArticle) return;
    const articleId = selectedArticle._id || selectedArticle.id;

    try {
      setSaving(true);
      await deleteKnowledgeArticle(articleId);
      showToast(`Article "${selectedArticle.title}" deleted.`);
      setModalMode(null);
      setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      showToast(err.message || 'Error deleting article.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.page}>
      {/* Toast Notification */}
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
          <span className={styles.badgeLabel}>CONTENT & HELP CENTER</span>
          <h1 className={styles.title}>Knowledge Base</h1>
          <p className={styles.subtitle}>
            Create, edit, publish/draft, and organize customer self-service articles.
          </p>
        </div>

        <button type="button" className={styles.createBtn} onClick={handleOpenCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Article
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterCard}>
        <div className={styles.filtersLeft}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">All Categories</option>
            {KB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Article Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Author</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span style={{ color: '#9ca3af' }}>Loading articles...</span>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📖</div>
                      <h3 className={styles.emptyTitle}>No articles found</h3>
                      <p className={styles.emptyDesc}>
                        {searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Try adjusting your search criteria or filters.'
                          : 'Get started by creating your first knowledge base article.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((art) => {
                  const articleId = art._id || art.id;
                  const isPublished = art.status === 'PUBLISHED';

                  return (
                    <tr key={articleId}>
                      <td>
                        <div className={styles.articleCell}>
                          <span className={styles.articleTitle}>{art.title}</span>
                          <span className={styles.articleSnippet}>
                            {art.content ? art.content.slice(0, 90) + '...' : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryPill}>{art.category}</span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            isPublished ? styles.statusPublished : styles.statusDraft
                          }`}
                        >
                          ● {art.status || 'DRAFT'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#d1d5db' }}>
                          {art.authorId?.name || 'Support Team'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#9ca3af' }}>
                          {formatDate(art.updatedAt || art.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.toggleBtn}`}
                            onClick={() => handleToggleStatus(art)}
                            title={isPublished ? 'Unpublish to Draft' : 'Publish Article'}
                          >
                            {isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleOpenEdit(art)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleOpenDelete(art)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Article Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className={styles.modalBackdrop} onClick={() => !saving && setModalMode(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalMode === 'create' ? 'Create Knowledge Article' : 'Edit Knowledge Article'}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => !saving && setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Article Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. How to Reset Your Account Password"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className={styles.formSelect}
                    >
                      {KB_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Article Content *</label>
                  <textarea
                    required
                    rows="8"
                    placeholder="Enter article body. Use line breaks between paragraphs and numbered steps..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className={styles.formTextarea}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setModalMode(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Article'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedArticle && (
        <div className={styles.modalBackdrop} onClick={() => !saving && setModalMode(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle} style={{ color: '#ef4444' }}>
                Delete Article
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => !saving && setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, color: '#e5e7eb', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong>"{selectedArticle.title}"</strong>?
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.825rem' }}>
                This action is permanent and will remove the article from the knowledge base for both
                customers and agents.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModalMode(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                style={{ background: '#ef4444' }}
                onClick={handleConfirmDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
