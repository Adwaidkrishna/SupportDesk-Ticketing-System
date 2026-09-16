import { useRef, useCallback } from 'react';
import styles from './OtpInput.module.css';

/**
 * 6-digit OTP input component.
 *
 * Features:
 * - Auto-advance to next digit on input
 * - Backspace navigates to previous digit
 * - Paste support for full 6-digit code
 * - Pop animation when digit is filled
 *
 * @param {string} value - Current OTP string (up to 6 chars)
 * @param {Function} onChange - Called with updated OTP string
 * @param {string} error - Error message
 * @param {boolean} disabled
 */
export default function OtpInput({
  value = '',
  onChange,
  error,
  disabled = false,
}) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const focusInput = useCallback((index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select();
    }
  }, []);

  const handleInput = useCallback(
    (index, e) => {
      const char = e.target.value.slice(-1); // Take only last char

      if (!/^\d$/.test(char) && char !== '') return;

      const newDigits = [...digits];
      newDigits[index] = char;
      const newValue = newDigits.join('').replace(/\s/g, '');
      onChange(newValue);

      // Auto-advance
      if (char && index < 5) {
        focusInput(index + 1);
      }
    },
    [digits, onChange, focusInput],
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newDigits = [...digits];

        if (digits[index]) {
          // Clear current digit
          newDigits[index] = '';
          onChange(newDigits.join('').replace(/\s/g, ''));
        } else if (index > 0) {
          // Move to previous and clear it
          newDigits[index - 1] = '';
          onChange(newDigits.join('').replace(/\s/g, ''));
          focusInput(index - 1);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight' && index < 5) {
        focusInput(index + 1);
      }
    },
    [digits, onChange, focusInput],
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

      if (pasted) {
        onChange(pasted);
        // Focus the next empty digit or last digit
        focusInput(Math.min(pasted.length, 5));
      }
    },
    [onChange, focusInput],
  );

  return (
    <div className={`${styles.otpWrapper} ${error ? styles.hasError : ''}`}>
      <div className={styles.digits}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={`${styles.digit} ${digit ? styles.filled : ''}`}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
