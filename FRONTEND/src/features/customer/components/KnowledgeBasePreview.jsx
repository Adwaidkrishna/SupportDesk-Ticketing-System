import styles from './KnowledgeBasePreview.module.css';

export default function KnowledgeBasePreview({ articles, onViewAll }) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Knowledge Base</h3>
        <button type="button" className={styles.viewAllButton} onClick={onViewAll}>
          View all →
        </button>
      </div>

      <div className={styles.list}>
        {articles.map((art) => (
          <div key={art.id} className={styles.item}>
            <div className={styles.iconBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className={styles.info}>
              <h4 className={styles.articleTitle}>{art.title}</h4>
              <p className={styles.articleDesc}>{art.description}</p>
            </div>
            <span className={styles.chevron}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
