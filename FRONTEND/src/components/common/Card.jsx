import styles from './Card.module.css';

/**
 * Reusable Dashboard Card / Surface Panel Component
 */
export default function Card({
  children,
  className = '',
  header,
  footer,
  hoverable = false,
  ...props
}) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`}
      {...props}
    >
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
