import styles from './TicketActivityChart.module.css';

export default function TicketActivityChart({ data }) {
  const { timeframe, points } = data;

  // SVG dimensions for chart rendering
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const minVal = 0;
  const maxVal = 15;

  // Map data points to SVG coordinates
  const coords = points.map((pt, i) => {
    const x = paddingX + (i / (points.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((pt.value - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { ...pt, x, y };
  });

  // Construct SVG cubic bezier smooth curve path
  const linePath = coords.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = coords[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

  const highlightedPoint = coords.find((p) => p.highlight) || coords[3];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ticket Activity</h3>
        <div className={styles.dropdown}>
          <span>{timeframe}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          <defs>
            <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={(height - paddingY) / 2 + paddingY / 2} x2={width - paddingX} y2={(height - paddingY) / 2 + paddingY / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255, 255, 255, 0.08)" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#blueAreaGradient)" />

          {/* Line stroke */}
          <path d={linePath} fill="none" stroke="#0A84FF" strokeWidth="3" strokeLinecap="round" />

          {/* Data Points */}
          {coords.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.highlight ? "6" : "4"}
                fill={pt.highlight ? "#0A84FF" : "#070709"}
                stroke="#0A84FF"
                strokeWidth="2.5"
              />
            </g>
          ))}
        </svg>

        {/* Floating Tooltip for Highlighted Point */}
        {highlightedPoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(highlightedPoint.x / width) * 100}%`,
              top: `${(highlightedPoint.y / height) * 100}%`,
            }}
          >
            <span className={styles.tooltipCount}>12 tickets</span>
            <span className={styles.tooltipDate}>Sep 7, 2026</span>
          </div>
        )}
      </div>

      {/* X Axis Labels */}
      <div className={styles.xAxis}>
        {coords.map((pt, idx) => (
          <span key={idx} className={styles.xLabel}>
            {pt.label}
          </span>
        ))}
      </div>
    </div>
  );
}
