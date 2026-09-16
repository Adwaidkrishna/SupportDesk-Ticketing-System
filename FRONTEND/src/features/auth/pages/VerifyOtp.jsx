import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import OtpInput from '../components/OtpInput';
import Button from '../../../components/common/Button';
import { validateOtp } from '../auth.validation';
import { mockVerifyOtp, mockResendOtp } from '../services/authMockApi';
import styles from './VerifyOtp.module.css';

const RESEND_COOLDOWN = 60; // seconds

/**
 * OTP Verification page.
 * User enters the 6-digit code sent to their email.
 */
export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = useCallback((value) => {
    setOtp(value);
    setError('');
    setServerError('');
    setSuccessMessage('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpError = validateOtp(otp);
    if (otpError) {
      setError(otpError);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await mockVerifyOtp(email, otp);

      if (result.success) {
        setSuccessMessage('Email verified successfully!');
        // Navigate to login after a brief delay
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setServerError(result.error);
        setOtp('');
      }
    } catch {
      setServerError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setServerError('');

    try {
      const result = await mockResendOtp(email);
      if (result.success) {
        setSuccessMessage('Verification code resent');
        setResendTimer(RESEND_COOLDOWN);
        setOtp('');
      }
    } catch {
      setServerError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.page}>
      <AuthHeader
        title="Verify your email"
        subtitle={
          <>
            We sent a 6-digit code to{' '}
            <span className={styles.emailHighlight}>{email}</span>
          </>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className={styles.otpSection}>
          {/* Server error */}
          {serverError && (
            <div className={styles.serverError} role="alert">
              {serverError}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className={styles.successMessage} role="status">
              {successMessage}
            </div>
          )}

          {/* OTP input */}
          <OtpInput
            value={otp}
            onChange={handleOtpChange}
            error={error}
            disabled={isSubmitting}
          />

          {/* Verify button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            large
            loading={isSubmitting}
            disabled={otp.length !== 6}
          >
            Verify email
          </Button>

          {/* Resend */}
          <div className={styles.resend}>
            <span>Didn&apos;t receive the code?</span>
            {resendTimer > 0 ? (
              <span className={styles.timer}>
                Resend in {formatTime(resendTimer)}
              </span>
            ) : (
              <button
                type="button"
                className={styles.resendButton}
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>

          {/* Back link */}
          <Link to="/register" className={styles.backLink}>
            ← Back to registration
          </Link>
        </div>
      </form>
    </div>
  );
}
