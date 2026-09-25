import styles from './CategoryOverview.module.css';

export default function CategoryOverview({ data }) {
  const { total, categories } = data;

  // Calculate SVG stroke-dasharray values for donut segments
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = categories.reduce((acc, cat) => {
    const percent = total > 0 ? cat.count / total : 0;
    const dashArray = `${percent * circumference} ${circumference}`;
    const dashOffset = -acc.accumulated * circumference;
    acc.accumulated += percent;
    acc.items.push({
      ...cat,
      dashArray,
      dashOffset,
    });
    return acc;
  }, { accumulated: 0, items: [] }).items;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Categories</h3>

      <div className={styles.content}>
        {/* SVG Donut Chart */}
        <div className={styles.chartArea}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donutSvg}>
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  className={styles.donutSegment}
                />
              ))}
            </g>
          </svg>

          {/* Center Text */}
          <div className={styles.centerText}>
            <span className={styles.totalValue}>{total}</span>
            <span className={styles.totalLabel}>Tickets</span>
          </div>
        </div>

        {/* Categories Legend List */}
        <div className={styles.legend}>
          {categories.map((cat, idx) => (
            <div key={idx} className={styles.legendItem}>
              <span className={styles.dot} style={{ backgroundColor: cat.color }} />
              <span className={styles.catName}>{cat.name}</span>
              <span className={styles.catCount}>{cat.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
