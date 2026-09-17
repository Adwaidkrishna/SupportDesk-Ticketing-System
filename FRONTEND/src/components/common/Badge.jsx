import styles from './Badge.module.css';

/**
 * Reusable Status, SLA, and Priority Badge Component
 * 
 * @param {'status' | 'sla' | 'priority' | 'default'} type
 * @param {string} value - Status, SLA, or Priority value string
 * @param {string} size - 'sm' | 'md'
 * @param {boolean} dot - Shows status dot indicator if true
 */
export default function Badge({
  type = 'default',
  value,
  size = 'md',
  dot = true,
  className = '',
  children,
}) {
  const displayValue = children || value;

  const normalized = String(value || children || '').toLowerCase();

  let variantClass = styles.defaultVariant;

  if (type === 'status' || normalized.includes('open') || normalized.includes('progress') || normalized.includes('resolved') || normalized.includes('closed') || normalized.includes('assigned')) {
    if (normalized.includes('open')) variantClass = styles.statusOpen;
    else if (normalized.includes('assigned')) variantClass = styles.statusAssigned;
    else if (normalized.includes('progress')) variantClass = styles.statusInProgress;
    else if (normalized.includes('waiting')) variantClass = styles.statusWaiting;
    else if (normalized.includes('resolved')) variantClass = styles.statusResolved;
    else if (normalized.includes('closed')) variantClass = styles.statusClosed;
  }

  if (type === 'sla' || normalized.includes('sla') || normalized.includes('risk') || normalized.includes('breach')) {
    if (normalized.includes('within') || normalized.includes('met') || normalized.includes('ok')) variantClass = styles.slaWithin;
    else if (normalized.includes('risk')) variantClass = styles.slaRisk;
    else if (normalized.includes('breach')) variantClass = styles.slaBreached;
  }

  if (type === 'priority' || normalized.includes('critical') || normalized.includes('high') || normalized.includes('medium') || normalized.includes('low')) {
    if (normalized.includes('critical')) variantClass = styles.priorityCritical;
    else if (normalized.includes('high')) variantClass = styles.priorityHigh;
    else if (normalized.includes('medium')) variantClass = styles.priorityMedium;
    else if (normalized.includes('low')) variantClass = styles.priorityLow;
  }

  return (
    <span
      className={`${styles.badge} ${variantClass} ${styles[size]} ${className}`}
    >
      {dot && <span className={styles.dot} />}
      <span className={styles.text}>{displayValue}</span>
    </span>
  );
}
