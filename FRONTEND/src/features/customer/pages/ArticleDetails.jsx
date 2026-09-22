import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  getKnowledgeArticleById,
  getKnowledgeArticles,
} from '../services/knowledgeBase.service';
import styles from './ArticleDetails.module.css';

export default function ArticleDetails() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAgent = location.pathname.startsWith('/agent');
  const basePath = isAgent ? '/agent/knowledge-base' : '/customer/knowledge-base';

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'yes' | 'no' | null

  useEffect(() => {
    let isMounted = true;

    async function fetchArticle() {
      try {
        setLoading(true);
        setError(null);
        setFeedbackGiven(null);

        const res = await getKnowledgeArticleById(articleId);
        const fetchedArticle = res?.data?.article;

        if (isMounted) {
          setArticle(fetchedArticle);

          if (fetchedArticle?.category) {
            // Fetch related articles in the same category
            getKnowledgeArticles({ category: fetchedArticle.category, limit: 4 })
              .then((relRes) => {
                if (isMounted && relRes?.data?.articles) {
                  setRelatedArticles(
                    relRes.data.articles.filter((a) => (a._id || a.id) !== articleId).slice(0, 3)
                  );
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Article could not be found.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const calculateReadTime = (content) => {
    if (!content) return '1 min read';
    const words = content.trim().split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleFeedback = (type) => {
    setFeedbackGiven(type);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topNav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(basePath)}
          >
            ← Back to Knowledge Base
          </button>
        </div>
        <div className={styles.contentCard} style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted, #94a3b8)' }}>Loading article content...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.page}>
        <div className={styles.topNav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(basePath)}
          >
            ← Back to Knowledge Base
          </button>
        </div>
        <div className={styles.contentCard} style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-danger, #ef4444)' }}>
            Article Not Found
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted, #94a3b8)' }}>
            {error || 'The requested article may have been unpublished or deleted.'}
          </p>
          <button
            type="button"
            className={styles.backBtn}
            style={{ display: 'inline-block' }}
            onClick={() => navigate(basePath)}
          >
            Return to Knowledge Base
          </button>
        </div>
      </div>
    );
  }

  const authorName = article.authorId?.name || article.author || 'SupportDesk Team';
  const authorInitials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Split content into readable paragraphs
  const paragraphs = article.content ? article.content.split('\n\n') : [];

  return (
    <div className={styles.page}>
      {/* Navigation Breadcrumb & Back button */}
      <div className={styles.topNav}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(basePath)}
        >
          ← Back to Knowledge Base
        </button>

        <div className={styles.breadcrumbs}>
          <span onClick={() => navigate(basePath)}>
            Knowledge Base
          </span>
          <span className={styles.bcSep}>/</span>
          <span>{article.category}</span>
          <span className={styles.bcSep}>/</span>
          <span className={styles.bcActive}>{article.title}</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Main Article Content Card */}
        <div className={styles.contentCard}>
          {/* Article Header */}
          <div className={styles.header}>
            <div className={styles.metaTop}>
              <span className={styles.categoryBadge}>{article.category}</span>
              <span className={styles.readTime}>⏱ {calculateReadTime(article.content)}</span>
            </div>

            <h1 className={styles.title}>{article.title}</h1>

            <div className={styles.authorBar}>
              <div className={styles.avatarCircle}>
                {authorInitials}
              </div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>
                  Written by <strong>{authorName}</strong>
                </span>
                <span className={styles.lastUpdated}>
                  Last updated on {formatDate(article.updatedAt || article.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Article Body Sections */}
          <div className={styles.articleBody}>
            {paragraphs.map((para, idx) => {
              // Check if paragraph looks like a section header (e.g. "1. Step" or short line followed by details)
              const isHeaderLike = para.length < 80 && !para.includes('.') && !para.includes(',');
              if (isHeaderLike) {
                return (
                  <div key={idx} className={styles.sectionBlock}>
                    <h2 className={styles.sectionHeading}>{para}</h2>
                  </div>
                );
              }

              return (
                <div key={idx} className={styles.sectionBlock}>
                  <p className={styles.sectionParagraph} style={{ whiteSpace: 'pre-line' }}>
                    {para}
                  </p>
                </div>
              );
            })}

            {/* Support Notice */}
            <div className={styles.calloutNote}>
              <div className={styles.calloutHeader}>
                <span className={styles.calloutIcon}>🔒</span>
                <strong>Security & Best Practices:</strong>
              </div>
              <p className={styles.calloutText}>
                Always ensure you are using verified credentials. Never share authentication codes or tokens with unauthorized parties.
              </p>
            </div>
          </div>

          {/* Helpful Feedback Widget */}
          <div className={styles.feedbackBox}>
            {feedbackGiven ? (
              <div className={styles.feedbackSuccess}>
                <span className={styles.feedbackCheck}>✓</span>
                <p>
                  Thank you for your feedback! We use your input to continuously improve our articles.
                </p>
              </div>
            ) : (
              <div className={styles.feedbackPrompt}>
                <h4 className={styles.feedbackTitle}>Was this article helpful?</h4>
                <div className={styles.feedbackButtons}>
                  <button
                    type="button"
                    className={`${styles.feedbackBtn} ${styles.yesBtn}`}
                    onClick={() => handleFeedback('yes')}
                  >
                    👍 Yes
                  </button>
                  <button
                    type="button"
                    className={`${styles.feedbackBtn} ${styles.noBtn}`}
                    onClick={() => handleFeedback('no')}
                  >
                    👎 No
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Articles Sidebar */}
        <div className={styles.sideColumn}>
          {relatedArticles.length > 0 && (
            <div className={styles.relatedCard}>
              <h3 className={styles.sideTitle}>Related Articles</h3>
              <div className={styles.relatedList}>
                {relatedArticles.map((rel) => (
                  <div
                    key={rel._id || rel.id}
                    className={styles.relatedItem}
                    onClick={() => navigate(`${basePath}/${rel._id || rel.id}`)}
                  >
                    <h4 className={styles.relatedItemTitle}>{rel.title}</h4>
                    <span className={styles.relatedMeta}>
                      {rel.category} • {calculateReadTime(rel.content)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need help card */}
          {!isAgent && (
            <div className={styles.contactSupportCard}>
              <div className={styles.supportCardIcon}>💬</div>
              <h3 className={styles.supportCardTitle}>Need more assistance?</h3>
              <p className={styles.supportCardDesc}>
                Our support engineers can help you resolve specific issues not covered in this guide.
              </p>
              <button
                type="button"
                className={styles.supportCardBtn}
                onClick={() => navigate('/customer/create-ticket')}
              >
                Open a Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
