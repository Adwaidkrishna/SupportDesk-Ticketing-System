import styles from './Skeleton.module.css';

/**
 * Reusable Loading Skeleton Component
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles[variant]} ${className}`}
          style={{
            width: width || (variant === 'circle' ? height : undefined),
            height: height || (variant === 'circle' ? width : undefined),
          }}
        />
      ))}
    </>
  );
}
