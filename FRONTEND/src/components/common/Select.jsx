import { useState, useRef, useEffect, useId } from 'react';
import styles from './Select.module.css';

/**
 * Reusable iOS-Inspired Custom Dropdown Selector Component
 * 
 * Supports:
 * - Avatar/Initials or Icon on trigger & items
 * - Label & Secondary subtitle
 * - Badges (role, status, count)
 * - Checkmark on selected item
 * - Keyboard navigation (Up, Down, Enter, Space, Escape, Tab)
 * - Outside click detection
 * - Viewport collision detection (flip position if overflowing screen bottom)
 * - Searchable option filter (optional)
 * 
 * @param {Array<{value: string, label: string, subtitle?: string, avatar?: string, initials?: string, icon?: React.ReactNode, badge?: string, badgeColor?: string}>} options
 * @param {string} value - Currently selected value
 * @param {function} onChange - Change handler (newValue)
 * @param {string} placeholder - Placeholder text if no value selected
 * @param {string} label - Input field label
 * @param {string} error - Error message string
 * @param {boolean} disabled - Disabled state
 * @param {boolean} searchable - Show search input inside dropdown
 * @param {string} className - Extra CSS class for container
 */
export default function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  error,
  disabled = false,
  searchable = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.subtitle && opt.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle position collision detection
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 260px below and more space above, drop up
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }

      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen, searchable]);

  // Open/Close toggle
  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
      const idx = options.findIndex((opt) => String(opt.value) === String(value));
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  };

  const handleSelect = (optionValue) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          toggleOpen();
        } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          e.preventDefault();
          handleSelect(filteredOptions[focusedIndex].value);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(filteredOptions.length - 1);
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const renderAvatar = (opt) => {
    if (opt?.avatar) {
      return <img src={opt.avatar} alt="" className={styles.avatarImg} />;
    }
    if (opt?.initials) {
      return <div className={styles.avatarInitials}>{opt.initials}</div>;
    }
    if (opt?.icon) {
      return <div className={styles.avatarIcon}>{opt.icon}</div>;
    }
    return null;
  };

  return (
    <div
      className={`${styles.container} ${isOpen ? styles.isOpen : ''} ${
        disabled ? styles.isDisabled : ''
      } ${error ? styles.hasError : ''} ${className}`}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}

      <button
        id={selectId}
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <div className={styles.triggerContent}>
          {selectedOption ? (
            <>
              {renderAvatar(selectedOption)}
              <div className={styles.textGroup}>
                <span className={styles.primaryText}>{selectedOption.label}</span>
                {selectedOption.subtitle && (
                  <span className={styles.secondaryText}>{selectedOption.subtitle}</span>
                )}
              </div>
            </>
          ) : (
            <span className={styles.placeholderText}>{placeholder}</span>
          )}
        </div>

        <span className={styles.chevronIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`${styles.menu} ${dropUp ? styles.dropUp : ''}`}
          role="listbox"
          tabIndex={-1}
        >
          {searchable && (
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.noResults}>No options found</div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = String(opt.value) === String(value);
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.optionItem} ${isSelected ? styles.isSelected : ''} ${
                      isFocused ? styles.isFocused : ''
                    }`}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <div className={styles.optionLeft}>
                      {renderAvatar(opt)}
                      <div className={styles.textGroup}>
                        <span className={styles.primaryText}>{opt.label}</span>
                        {opt.subtitle && (
                          <span className={styles.secondaryText}>{opt.subtitle}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.optionRight}>
                      {opt.badge && (
                        <span
                          className={styles.badge}
                          style={
                            opt.badgeColor
                              ? { backgroundColor: opt.badgeColor, color: '#FFF' }
                              : undefined
                          }
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <span className={styles.checkmark}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
