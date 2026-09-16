import styles from './AuthHeader.module.css';

/**
 * Auth page header with SupportDesk branding.
 *
 * @param {string} title - Page heading (e.g. "Welcome back")
 * @param {string} subtitle - Description text below heading
 */
export default function AuthHeader({ title, subtitle }) {
  return (
    <div className={styles.header}>
      {/* Logo mark — shield icon */}
      <div className={styles.logoMark}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
      </div>

      <p className={styles.appName}>SupportDesk</p>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
