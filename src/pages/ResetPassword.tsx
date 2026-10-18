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
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface ResetPasswordProps {
  onNavigate: (view: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const [oobCode, setOobCode] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [targetRole, setTargetRole] = useState<'admin' | 'member'>('member');
  const [verifyingCode, setVerifyingCode] = useState<boolean>(true);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Parse and verify oobCode and mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode') || params.get('code') || '';
    const mode = params.get('mode') || 'resetPassword';

    if (mode !== 'resetPassword' && mode !== '') {
      setVerifyingCode(false);
      setCodeError(
        mode === 'verifyEmail'
          ? 'This link is for email address verification, not password reset.'
          : `Unsupported authentication action: ${mode}.`
      );
      return;
    }

    if (!code) {
      setVerifyingCode(false);
      setCodeError(
        'No password reset action code detected. Please open the link sent directly to your email inbox, or request a new reset link.'
      );
      return;
    }

    setOobCode(code);
    setVerifyingCode(true);
    setCodeError(null);

    RealEmailAuth.verifyResetCode(code)
      .then((res) => {
        if (res.success && res.email) {
          setTargetEmail(res.email);
          setTargetRole(res.role || 'member');
          setCodeError(null);
        } else {
          setCodeError(
            res.error || 'The password reset link is invalid, expired, or has already been used.'
          );
        }
      })
      .catch((err) => {
        setCodeError(
          err?.message || 'Failed to verify reset code. Please request a new password reset email.'
        );
      })
      .finally(() => {
        setVerifyingCode(false);
      });
  }, []);

  const passwordPolicy = validatePasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!oobCode) {
      setSubmitError('Missing password reset action code.');
      return;
    }

    if (!passwordPolicy.valid) {
      setSubmitError(
        passwordPolicy.errors[0] ||
          'Password does not meet security requirements (min 8 characters).'
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

  const navigateToLogin = () => {
    window.history.pushState(null, '', targetRole === 'admin' ? '/admin/login' : '/student/login');
    onNavigate(targetRole === 'admin' ? 'admin-login' : 'member-login');
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
          <ArrowLeft size={16} /> Return to Home
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
            {isSuccess ? 'Password Reset Complete' : 'Set New Secure Password'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
            {isSuccess
              ? 'Your account password has been successfully updated.'
              : targetEmail
              ? `Configuring password for ${targetEmail}`
              : 'Hikmah Library Official Password Reset'}
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
              Verifying link with Authentication Service...
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              Confirming action code validity and single-use status.
            </div>
          </div>
        )}

        {/* INVALID / EXPIRED / MISSING CODE STATE */}
        {!verifyingCode && (!targetEmail || codeError) && !isSuccess && (
          <div style={{ padding: '6px 0 16px 0' }}>
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
              <div>
                <strong style={{ display: 'block', color: '#FFFFFF', marginBottom: '3px' }}>
                  Action Required
                </strong>
                {codeError || 'This password reset link is invalid, expired, or has already been used.'}
              </div>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginBottom: '20px', lineHeight: '1.5', textAlign: 'center' }}>
              Password reset links can only be used once and expire for your security. Please return to the sign-in page to request a fresh password reset email.
            </p>

            <button
              onClick={navigateToLogin}
              className="btn-gold"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: '700' }}
            >
              Return to Sign In & Request Reset
            </button>
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
              <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              <span>
                Verified identity for: <strong>{targetEmail}</strong> ({targetRole === 'admin' ? 'Administrator' : 'Student Member'})
              </span>
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.86rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left input-with-icon-right"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                  }}
                />
                <Lock size={18} className="form-icon-left" />
                <button
                  type="button"
                  className="form-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.86rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left input-with-icon-right"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                  }}
                />
                <Lock size={18} className="form-icon-left" />
                <button
                  type="button"
                  className="form-icon-right"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Policy Checks */}
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
                  <RefreshCw size={16} className="spin" /> Updating Password in Authentication Service...
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
              Your password has been successfully verified and updated in Firebase Authentication. Your old password is no longer valid.
            </p>

            <button
              onClick={navigateToLogin}
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
              Sign In with New Password →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
