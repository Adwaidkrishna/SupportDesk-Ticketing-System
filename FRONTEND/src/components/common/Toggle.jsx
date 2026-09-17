import styles from './Toggle.module.css';

/**
 * Reusable iOS-Inspired Toggle Switch Component
 * 
 * @param {boolean} checked - Current toggle state
 * @param {function} onChange - Toggle handler (newCheckedState)
 * @param {string} label - Optional side label text
 * @param {string} description - Optional description below label
 * @param {boolean} disabled - Disabled state
 */
export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div
      className={`${styles.toggleContainer} ${disabled ? styles.disabled : ''} ${className}`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className={`${styles.switch} ${checked ? styles.checked : ''}`}>
        <div className={styles.thumb} />
      </div>

      {(label || description) && (
        <div className={styles.labelGroup}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </div>
      )}
    </div>
  );
}
