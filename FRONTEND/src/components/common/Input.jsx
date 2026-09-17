import { useState } from 'react';
import styles from './Input.module.css';

/**
 * Reusable Input / Textarea / SearchInput component
 *
 * @param {string} label
 * @param {string} error - Error message to display
 * @param {string} helper - Helper text to display
 * @param {string} id - Input ID
 * @param {boolean} multiline - Renders textarea if true
 * @param {number} rows - Rows for textarea
 * @param {React.ReactNode} icon - Left icon element
 * @param {React.ReactNode} rightElement - Right action element (e.g. clear button)
 */
export default function Input({
  label,
  error,
  helper,
  id,
  icon,
  rightElement,
  multiline = false,
  rows = 4,
  type = 'text',
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`${styles.inputGroup} ${error ? styles.hasError : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.inputIcon}>{icon}</span>}

        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            className={`${styles.input} ${styles.textarea} ${icon ? styles.hasIcon : ''}`}
            {...props}
          />
        ) : (
          <input
            id={id}
            type={computedType}
            className={`${styles.input} ${icon ? styles.hasIcon : ''} ${
              isPassword || rightElement ? styles.hasRightElement : ''
            }`}
            {...props}
          />
        )}

        {isPassword && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((prev) => !prev)}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}

        {!isPassword && rightElement && (
          <div className={styles.rightElement}>{rightElement}</div>
        )}
      </div>

      {error ? (
        <span className={styles.errorMessage}>{error}</span>
      ) : helper ? (
        <span className={styles.helperMessage}>{helper}</span>
      ) : null}
    </div>
  );
}
