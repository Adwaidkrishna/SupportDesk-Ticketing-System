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
  icon,
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
        {icon && <span className={styles.inputIcon}>{icon}</span>}
        <input
          id={id}
          className={`${styles.input} ${icon ? styles.hasIcon : ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
