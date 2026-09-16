import styles from './Input.module.css';

/**
 * Reusable Input component with label and error display
 *
 * @param {string} label
 * @param {string} error - Error message to display
 * @param {string} id - Input ID (also used for label htmlFor)
 */
export default function Input({
  label,
  error,
  id,
  className = '',
  ...props
}) {
  return (
    <div
      className={`${styles.inputGroup} ${error ? styles.hasError : ''} ${className}`}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input id={id} className={styles.input} {...props} />
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
