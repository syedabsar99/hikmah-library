import React, { useState, useEffect } from 'react';
import { RealEmailAuth } from '../services/emailAuthService';
import { validatePasswordPolicy } from '../utils/validation';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

interface ResetPasswordProps {
  onNavigate: (view: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const [oobCode, setOobCode] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [verifyingCode, setVerifyingCode] = useState<boolean>(true);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  // Form states
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const verifyCodeString = (codeToVerify: string) => {
    const trimmed = (codeToVerify || '').trim();
    if (!trimmed) {
      setVerifyingCode(false);
      setCodeError('Please enter the 8-character verification code or password reset token.');
      return;
    }

    setVerifyingCode(true);
    setCodeError(null);

    RealEmailAuth.verifyResetCode(trimmed)
      .then((res) => {
        if (res.success && res.email) {
          setOobCode(trimmed);
          setTargetEmail(res.email);
          setCodeError(null);
        } else {
          setCodeError(
            res.error || 'The password reset link/code is invalid, expired, or has already been used.'
          );
        }
      })
      .catch((err) => {
        setCodeError(
          err?.message || 'Failed to verify security token. Please request a new password reset link.'
        );
      })
      .finally(() => {
        setVerifyingCode(false);
      });
  };

  // Parse and verify oobCode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode') || params.get('code') || '';
    if (code) {
      setOobCode(code);
      verifyCodeString(code);
    } else {
      setVerifyingCode(false);
      // Don't show hard error immediately if user navigated directly without query param
      setCodeError(null);
    }
  }, []);

  const passwordPolicy = validatePasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!oobCode) {
      setSubmitError('Missing security reset code.');
      return;
    }

    if (!passwordPolicy.valid) {
      setSubmitError(
        passwordPolicy.errors[0] ||
          'Password does not meet the minimum security requirements (at least 8 characters).'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await RealEmailAuth.confirmPasswordReset(oobCode, newPassword, confirmPassword);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setSubmitError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'An unexpected error occurred while resetting your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #080E1A 0%, #0F1E36 50%, #162A4A 100%)',
      }}
    >
      <div
        className="glass-dark"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 30px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(212, 175, 55, 0.15)',
        }}
      >
        <button
          onClick={() => {
            window.history.pushState(null, '', '/');
            onNavigate('home');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-gold)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: '600',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Return to Main Website
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '2px solid var(--accent-gold)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              boxShadow: '0 4px 14px rgba(212,175,55,0.25)',
            }}
          >
            {isSuccess ? <CheckCircle2 size={30} /> : <KeyRound size={28} />}
          </div>

          <h2 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: '800', marginBottom: '6px' }}>
            {isSuccess ? 'Password Reset Successful' : 'Set New Secure Password'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
            {isSuccess
              ? 'Your password has been successfully updated.'
              : targetEmail
              ? `Resetting credentials for ${targetEmail}`
              : 'Hikmah Library Cryptographic Password Reset'}
          </p>
        </div>

        {/* LOADING STATE */}
        {verifyingCode && (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 10px',
              color: '#E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <RefreshCw size={28} className="spin" style={{ color: 'var(--accent-gold)' }} />
            <div style={{ fontSize: '0.92rem', fontWeight: '600' }}>
              Verifying security link with Authentication Engine...
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              Checking token validity and single-use signature.
            </div>
          </div>
        )}

        {/* MANUAL CODE ENTRY / ERROR STATE */}
        {!verifyingCode && (!targetEmail || codeError) && !isSuccess && (
          <div style={{ padding: '6px 0 16px 0' }}>
            {codeError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  textAlign: 'left',
                  lineHeight: '1.5',
                }}
              >
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
                <div>{codeError}</div>
              </div>
            )}

            <div
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 16px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              <label
                style={{
                  display: 'block',
                  color: '#F8FAFC',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  marginBottom: '8px',
                }}
              >
                Enter Verification Code or Security Link
              </label>
              <p style={{ color: '#94A3B8', fontSize: '0.78rem', marginBottom: '12px', lineHeight: '1.4' }}>
                Check the email dispatched to your inbox. Enter the 8-character Verification Code (or paste the reset code/link) below:
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 8A3F9B2C or paste code"
                  style={{
                    flex: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '700',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      verifyCodeString(manualCode);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => verifyCodeString(manualCode)}
                  style={{ padding: '10px 16px', fontSize: '0.86rem', whiteSpace: 'nowrap' }}
                >
                  Verify Code
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                onClick={() => onNavigate('member-login')}
                className="btn-outline"
                style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
              >
                Request a Fresh Reset Email
              </button>
            </div>
          </div>
        )}

        {/* SUBMISSION ERROR */}
        {!verifyingCode && targetEmail && submitError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              color: '#FCA5A5',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#EF4444' }} />
            <span>{submitError}</span>
          </div>
        )}

        {/* RESET PASSWORD FORM */}
        {!verifyingCode && targetEmail && !isSuccess && (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: '#6EE7B7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>Token verified for: <strong style={{ color: '#FFFFFF' }}>{targetEmail}</strong></span>
            </div>

            {/* New Password Input */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.85rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password here"
                  style={{
                    paddingRight: '44px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                  }}
                  required
                  autoFocus
                  autoComplete="new-password"
                />
                <Lock
                  size={16}
                  className="form-icon-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.85rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter password again to confirm"
                  style={{
                    paddingRight: '44px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                  }}
                  required
                  autoComplete="new-password"
                />
                <Lock
                  size={16}
                  className="form-icon-left"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Policy Live Requirements Checklist */}
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.35)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ color: '#E2E8F0', fontWeight: '700', marginBottom: '8px' }}>
                Security Requirements:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <span style={{ color: passwordPolicy.hasMinLength ? '#10B981' : '#94A3B8' }}>
                  {passwordPolicy.hasMinLength ? '✓' : '○'} At least 8 characters
                </span>
                <span style={{ color: passwordPolicy.hasUppercase ? '#10B981' : '#94A3B8' }}>
                  {passwordPolicy.hasUppercase ? '✓' : '○'} 1 Uppercase (A-Z)
                </span>
                <span style={{ color: passwordPolicy.hasNumber ? '#10B981' : '#94A3B8' }}>
                  {passwordPolicy.hasNumber ? '✓' : '○'} 1 Number (0-9)
                </span>
                <span style={{ color: passwordPolicy.hasSpecial ? '#10B981' : '#94A3B8' }}>
                  {passwordPolicy.hasSpecial ? '✓' : '○'} 1 Special (!@#$)
                </span>
              </div>
              {confirmPassword.length > 0 && (
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    color: passwordsMatch ? '#10B981' : '#EF4444',
                    fontWeight: '600',
                  }}
                >
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-gold"
              disabled={submitting || !passwordPolicy.valid || !passwordsMatch}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.96rem',
                opacity: submitting || !passwordPolicy.valid || !passwordsMatch ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw size={16} className="spin" /> Updating Password in Firebase...
                </span>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}

        {/* SUCCESS CONFIRMATION */}
        {isSuccess && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10B981',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={38} />
            </div>

            <h3 style={{ color: '#FFFFFF', fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>
              Password Reset Complete!
            </h3>

            <p style={{ color: '#E2E8F0', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '26px' }}>
              Your password has been successfully verified and updated. Your old password is no longer valid.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => {
                  window.history.pushState(null, '', '/');
                  onNavigate('home');
                }}
                className="btn-gold"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
                }}
              >
                Go back to main website
              </button>

              <button
                onClick={() => {
                  window.history.pushState(null, '', '/admin/login');
                  onNavigate('admin-login');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  color: 'var(--accent-gold)',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Sign In with New Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
