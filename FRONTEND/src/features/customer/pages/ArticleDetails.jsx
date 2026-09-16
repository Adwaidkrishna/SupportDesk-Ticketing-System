import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { knowledgeBaseArticlesList } from '../customerMockData';
import styles from './ArticleDetails.module.css';

export default function ArticleDetails() {
  const { articleId } = useParams();
  const navigate = useNavigate();

  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'yes' | 'no' | null

  // Find target article or fallback to first article
  const article =
    knowledgeBaseArticlesList.find((a) => a.id === articleId) ||
    knowledgeBaseArticlesList[0];

  // Related articles in same category or fallback to other popular articles
  const relatedArticles = knowledgeBaseArticlesList
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  const handleFeedback = (type) => {
    setFeedbackGiven(type);
  };

  return (
    <div className={styles.page}>
      {/* Navigation Breadcrumb & Back button */}
      <div className={styles.topNav}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/customer/knowledge-base')}
        >
          ← Back to Knowledge Base
        </button>

        <div className={styles.breadcrumbs}>
          <span onClick={() => navigate('/customer/knowledge-base')}>
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
              <span className={styles.readTime}>⏱ {article.readTime}</span>
              <span className={styles.views}>👀 {article.views} views</span>
            </div>

            <h1 className={styles.title}>{article.title}</h1>

            <div className={styles.authorBar}>
              <div className={styles.avatarCircle}>
                {article.author
                  ? article.author
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                  : 'SD'}
              </div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>
                  Written by <strong>{article.author || 'SupportDesk Team'}</strong>
                </span>
                <span className={styles.lastUpdated}>
                  Last updated on {article.lastUpdated || 'Sep 15, 2026'}
                </span>
              </div>
            </div>
          </div>

          {/* Article Summary Snippet Banner */}
          <div className={styles.summaryBanner}>
            <div className={styles.summaryIcon}>💡</div>
            <p className={styles.summaryText}>{article.snippet}</p>
          </div>

          {/* Article Body Sections */}
          <div className={styles.articleBody}>
            {article.sections && article.sections.length > 0 ? (
              article.sections.map((sec, idx) => (
                <div key={idx} className={styles.sectionBlock}>
                  <h2 className={styles.sectionHeading}>{sec.heading}</h2>
                  <p className={styles.sectionParagraph}>{sec.content}</p>
                </div>
              ))
            ) : (
              <div className={styles.sectionBlock}>
                <h2 className={styles.sectionHeading}>1. Overview & Setup</h2>
                <p className={styles.sectionParagraph}>
                  Follow the step-by-step instructions below to configure your settings,
                  verify access credentials, and ensure optimal security compliance on
                  the SupportDesk platform.
                </p>
                <h2 className={styles.sectionHeading}>2. Step-by-Step Guide</h2>
                <p className={styles.sectionParagraph}>
                  1. Log into your customer account using your verified credentials.
                  <br />
                  2. Navigate to your dashboard settings tab located in the navigation header.
                  <br />
                  3. Save changes and confirm via email notification.
                </p>
              </div>
            )}

            {/* Callout Box */}
            <div className={styles.calloutNote}>
              <div className={styles.calloutHeader}>
                <span className={styles.calloutIcon}>🔒</span>
                <strong>Security Best Practice:</strong>
              </div>
              <p className={styles.calloutText}>
                Always store your backup recovery codes in a secure offline password manager.
                Never share your 2FA authentication codes or session tokens with anyone.
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
                    👍 Yes ({article.helpfulRating || '98%'})
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

        {/* Sidebar: Related Articles & Support CTA */}
        <div className={styles.sidebar}>
          {/* Related Articles Card */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Related Articles</h3>
            <div className={styles.relatedList}>
              {relatedArticles.map((item) => (
                <div
                  key={item.id}
                  className={styles.relatedItem}
                  onClick={() => {
                    setFeedbackGiven(null);
                    navigate(`/customer/knowledge-base/${item.id}`);
                  }}
                >
                  <h4 className={styles.relatedTitle}>{item.title}</h4>
                  <div className={styles.relatedMeta}>
                    <span>{item.category}</span>
                    <span>•</span>
                    <span>{item.readTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Still Need Support Card */}
          <div className={styles.supportCard}>
            <div className={styles.supportIcon}>💬</div>
            <h3 className={styles.supportTitle}>Didn't find your answer?</h3>
            <p className={styles.supportDesc}>
              Our technical support engineers are standing by to help resolve your issue.
            </p>
            <button
              type="button"
              className={styles.supportBtn}
              onClick={() => navigate('/customer/create-ticket')}
            >
              Create Support Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
