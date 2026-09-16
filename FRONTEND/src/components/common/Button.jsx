import styles from './Button.module.css';

/**
 * Reusable Button component
 *
 * @param {'primary' | 'secondary' | 'ghost'} variant - Visual style
 * @param {boolean} loading - Shows spinner and disables interaction
 * @param {boolean} fullWidth - Stretches to fill container
 * @param {boolean} large - Larger padding and font
 * @param {React.ReactNode} children
 */
export default function Button({
  children,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  large = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth && styles.fullWidth,
    large && styles.large,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className={`${styles.spinner} ${
            variant !== 'primary' ? styles.secondarySpinner : ''
          }`}
        />
      )}
      {children}
    </button>
  );
}
