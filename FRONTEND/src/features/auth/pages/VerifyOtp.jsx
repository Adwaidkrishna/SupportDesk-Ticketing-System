import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import OtpInput from '../components/OtpInput';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { validateOtp, validateEmail } from '../auth.validation';
import {
  verifyOtp as verifyOtpService,
  resendOtp as resendOtpService,
} from '../services/auth.service';
import styles from './VerifyOtp.module.css';

const RESEND_COOLDOWN = 60; // seconds

/**
 * OTP Verification page.
 * User enters the 6-digit code sent to their email.
 */
export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || '',
  );
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setEmailError('Email is required');
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }

    const otpError = validateOtp(otp);
    if (otpError) {
      setError(otpError);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await verifyOtpService({ email, otp });

      if (result.success) {
        setSuccessMessage('Email verified successfully! Redirecting to login...');
        // Navigate to login after a brief delay
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setServerError(result.message || 'Verification failed');
        setOtp('');
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred');
      setOtp('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setEmailError('Please enter your email to resend the code');
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }

    setIsResending(true);
    setServerError('');

    try {
      const result = await resendOtpService(email);
      if (result.success) {
        setSuccessMessage(result.message || 'Verification code resent');
        setResendTimer(RESEND_COOLDOWN);
        setOtp('');
      }
    } catch (err) {
      setServerError(err.message || 'Failed to resend code');
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
          email ? (
            <>
              We sent a 6-digit code to{' '}
              <span className={styles.emailHighlight}>{email}</span>
            </>
          ) : (
            'Enter your registered email and the 6-digit verification code'
          )
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

          {/* Fallback Email Input if not present in state */}
          {!location.state?.email && (
            <div style={{ marginBottom: '16px', width: '100%' }}>
              <Input
                id="otp-email"
                name="email"
                type="email"
                label="Registered Email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                error={emailError}
                required
              />
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
            Verify email →
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
