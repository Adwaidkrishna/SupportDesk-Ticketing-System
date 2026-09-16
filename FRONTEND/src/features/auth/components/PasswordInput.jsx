import { useState } from 'react';
import styles from './PasswordInput.module.css';

/**
 * Password input with show/hide toggle.
 *
 * @param {string} label
 * @param {string} error
 * @param {string} id
 */
export default function PasswordInput({
  label,
  error,
  id,
  className = '',
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`${styles.passwordGroup} ${error ? styles.hasError : ''} ${className}`}
    >
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          {...props}
        />
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            /* Eye-off icon */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Eye icon */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
