import { getPasswordStrength } from '../auth.validation';
import styles from './PasswordStrength.module.css';

/**
 * Visual password strength indicator.
 * Shows 4 bars that fill based on password complexity.
 *
 * @param {string} password - Current password value
 */
export default function PasswordStrength({ password }) {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className={styles.strengthWrapper}>
      <div className={styles.bars}>
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`${styles.bar} ${score >= level ? styles.barActive : ''}`}
            style={score >= level ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      {label && (
        <span className={styles.label} style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
