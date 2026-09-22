import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getKnowledgeCategories,
  getKnowledgeArticles,
} from '../services/knowledgeBase.service';
import styles from './KnowledgeBase.module.css';

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAgent = location.pathname.startsWith('/agent');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories and articles
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [catRes, artRes] = await Promise.all([
          getKnowledgeCategories().catch(() => ({ data: { categories: [] } })),
          getKnowledgeArticles({
            search: searchQuery,
            category: selectedCategory === 'all' ? '' : selectedCategory,
          }).catch(() => ({ data: { articles: [] } })),
        ]);

        if (isMounted) {
          if (catRes?.data?.categories) {
            setCategories(catRes.data.categories);
          }
          if (artRes?.data?.articles) {
            setArticles(artRes.data.articles);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load knowledge base articles.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Debounce search query slightly if typing
    const timeoutId = setTimeout(() => {
      loadData();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, selectedCategory]);

  const calculateReadTime = (content) => {
    if (!content) return '1 min read';
    const words = content.trim().split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const getSnippet = (content) => {
    if (!content) return '';
    const clean = content.replace(/\n+/g, ' ').trim();
    return clean.length > 150 ? clean.substring(0, 147) + '...' : clean;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // First 3 articles serve as popular/featured articles when in all-view
  const popularArticles = articles.slice(0, 3);

  const handleArticleClick = (articleId) => {
    const basePath = isAgent ? '/agent/knowledge-base' : '/customer/knowledge-base';
    navigate(`${basePath}/${articleId}`);
  };

  const renderCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'rocket':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-3.05 11a22.35 22.35 0 0 1-3.95 2z" />
          </svg>
        );
      case 'shield':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'credit-card':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        );
      case 'tool':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      case 'cpu':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
          </svg>
        );
      case 'folder':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero Banner with Search */}
      <div className={styles.heroCard}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>KNOWLEDGE BASE</span>
          <h1 className={styles.heroTitle}>How can we help you today?</h1>
          <p className={styles.heroSubtitle}>
            Search our comprehensive guides, tutorials, and troubleshooting articles.
          </p>

          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search for articles, guides, or keywords (e.g. 2FA, password, Slack)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Browse by Category</h2>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              className={styles.resetCategoryBtn}
              onClick={() => setSelectedCategory('all')}
            >
              Show All Categories
            </button>
          )}
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
            return (
              <div
                key={cat.id || cat.name}
                className={`${styles.categoryCard} ${isSelected ? styles.selectedCat : ''}`}
                onClick={() =>
                  setSelectedCategory(isSelected ? 'all' : cat.name || cat.id)
                }
              >
                <div
                  className={styles.catIconWrap}
                  style={{
                    backgroundColor: `${cat.color || '#6366F1'}1A`,
                    color: cat.color || '#6366F1',
                  }}
                >
                  {renderCategoryIcon(cat.icon)}
                </div>
                <div className={styles.catInfo}>
                  <h3 className={styles.catTitle}>{cat.title || cat.name}</h3>
                  <p className={styles.catDesc}>{cat.description}</p>
                </div>
                <div className={styles.catFooter}>
                  <span className={styles.catCount}>{cat.articleCount} articles</span>
                  <span className={styles.catArrow}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Articles Section (Shown when no search/category filter active) */}
      {selectedCategory === 'all' && !searchQuery && popularArticles.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.titleWithIcon}>
              <span className={styles.popularIcon}>🔥</span>
              <h2 className={styles.sectionTitle}>Featured Articles</h2>
            </div>
          </div>

          <div className={styles.popularGrid}>
            {popularArticles.map((article) => (
              <div
                key={article._id || article.id}
                className={styles.articleCard}
                onClick={() => handleArticleClick(article._id || article.id)}
              >
                <div className={styles.articleTop}>
                  <span className={styles.categoryBadge}>{article.category}</span>
                  <span className={styles.readTime}>{calculateReadTime(article.content)}</span>
                </div>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <p className={styles.articleSnippet}>{getSnippet(article.content)}</p>

                <div className={styles.articleMeta}>
                  <span>Updated {formatDate(article.updatedAt || article.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All / Filtered Articles Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {loading
              ? 'Loading Articles...'
              : searchQuery
              ? `Search Results (${articles.length})`
              : selectedCategory !== 'all'
              ? `${selectedCategory} Articles (${articles.length})`
              : 'All Knowledge Articles'}
          </h2>
        </div>

        {error && (
          <div className={styles.emptyCard} style={{ borderColor: 'var(--color-danger, #ef4444)' }}>
            <h3 className={styles.emptyTitle}>Error loading articles</h3>
            <p className={styles.emptyDesc}>{error}</p>
          </div>
        )}

        {!loading && !error && articles.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No matching articles found</h3>
            <p className={styles.emptyDesc}>
              Try searching with different keywords or browse our categories.
            </p>
            <button
              type="button"
              className={styles.clearFiltersBtn}
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Clear Search & Filters
            </button>
          </div>
        ) : (
          <div className={styles.articlesList}>
            {articles.map((article) => (
              <div
                key={article._id || article.id}
                className={styles.articleRow}
                onClick={() => handleArticleClick(article._id || article.id)}
              >
                <div className={styles.articleRowLeft}>
                  <div className={styles.docIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div className={styles.rowInfo}>
                    <h3 className={styles.rowTitle}>{article.title}</h3>
                    <p className={styles.rowSnippet}>{getSnippet(article.content)}</p>
                    <div className={styles.rowMeta}>
                      <span className={styles.catBadge}>{article.category}</span>
                      <span>{calculateReadTime(article.content)}</span>
                      <span>Updated {formatDate(article.updatedAt || article.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <span className={styles.readLink}>Read Article →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support CTA Box (Only shown for Customers) */}
      {!isAgent && (
        <div className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h3 className={styles.ctaTitle}>Still need help?</h3>
            <p className={styles.ctaDesc}>
              Our dedicated support team is available 24/7 to assist you with any technical issues.
            </p>
          </div>
          <button
            type="button"
            className={styles.ctaButton}
            onClick={() => navigate('/customer/create-ticket')}
          >
            Create Support Ticket
          </button>
        </div>
      )}
    </div>
  );
}
