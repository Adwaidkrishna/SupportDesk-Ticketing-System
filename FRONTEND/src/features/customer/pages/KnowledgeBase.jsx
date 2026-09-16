import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { knowledgeBaseCategories, knowledgeBaseArticlesList } from '../customerMockData';
import styles from './KnowledgeBase.module.css';

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredArticles = knowledgeBaseArticlesList.filter((article) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || article.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const popularArticles = knowledgeBaseArticlesList.filter((a) => a.isPopular);

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
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
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
          {knowledgeBaseCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`${styles.categoryCard} ${isSelected ? styles.selectedCat : ''}`}
                onClick={() =>
                  setSelectedCategory(isSelected ? 'all' : cat.id)
                }
              >
                <div
                  className={styles.catIconWrap}
                  style={{
                    backgroundColor: `${cat.color}1A`,
                    color: cat.color,
                  }}
                >
                  {renderCategoryIcon(cat.icon)}
                </div>
                <div className={styles.catInfo}>
                  <h3 className={styles.catTitle}>{cat.title}</h3>
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
      {selectedCategory === 'all' && !searchQuery && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.titleWithIcon}>
              <span className={styles.popularIcon}>🔥</span>
              <h2 className={styles.sectionTitle}>Popular Articles</h2>
            </div>
          </div>

          <div className={styles.popularGrid}>
            {popularArticles.map((article) => (
              <div
                key={article.id}
                className={styles.articleCard}
                onClick={() => navigate(`/customer/knowledge-base/${article.id}`)}
              >
                <div className={styles.articleTop}>
                  <span className={styles.categoryBadge}>{article.category}</span>
                  <span className={styles.readTime}>{article.readTime}</span>
                </div>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <p className={styles.articleSnippet}>{article.snippet}</p>

                <div className={styles.articleMeta}>
                  <span>👀 {article.views} views</span>
                  <span>👍 {article.helpfulRating}</span>
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
            {searchQuery
              ? `Search Results (${filteredArticles.length})`
              : selectedCategory !== 'all'
              ? `Category Articles (${filteredArticles.length})`
              : 'All Knowledge Articles'}
          </h2>
        </div>

        {filteredArticles.length === 0 ? (
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
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className={styles.articleRow}
                onClick={() => navigate(`/customer/knowledge-base/${article.id}`)}
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
                    <p className={styles.rowSnippet}>{article.snippet}</p>
                    <div className={styles.rowMeta}>
                      <span className={styles.catBadge}>{article.category}</span>
                      <span>{article.readTime}</span>
                      <span>Updated {article.lastUpdated}</span>
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

      {/* Support CTA Box */}
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
    </div>
  );
}
