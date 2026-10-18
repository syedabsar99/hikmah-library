import React, { useState, useEffect } from 'react';
import { RealEmailAuth } from '../services/emailAuthService';
import { Mail, AlertTriangle, CheckCircle2, X, RefreshCw, Send, Clock, Shield } from 'lucide-react';

interface EmailPasswordResetModalProps {
  isOpen: boolean;
  role: 'admin' | 'member';
  initialEmail?: string;
  onClose: () => void;
}

export const EmailPasswordResetModal: React.FC<EmailPasswordResetModalProps> = ({
  isOpen,
  role,
  initialEmail = '',
  onClose,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      const email = initialEmail || '';
      setEmailInput(email);

      // Check existing cooldown
      const remaining = RealEmailAuth.getRemainingCooldown(email);
      setCooldown(remaining);
    }
  }, [isOpen, role, initialEmail]);

  // Live countdown timer for 60s cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const norm = RealEmailAuth.normalizeEmail(emailInput);
    if (!norm.isValid) {
      setError(norm.error || 'Please enter a valid email address.');
      return;
    }

    // Cooldown check
    const currentRemaining = RealEmailAuth.getRemainingCooldown(norm.email);
    if (currentRemaining > 0) {
      setCooldown(currentRemaining);
      setError(`Please wait ${currentRemaining} seconds before requesting another reset email.`);
      return;
    }

    setLoading(true);
    try {
      const result =
        role === 'admin'
          ? await RealEmailAuth.sendAdminResetEmail(norm.email)
          : await RealEmailAuth.sendMemberResetEmail(norm.email);

      if (result.success) {
        setSuccessMsg('A password reset link has been sent to your email. Please check your inbox and Spam folder.');
        setCooldown(60);
      } else {
        setError(result.message || 'Failed to dispatch password reset request.');
        if (result.cooldownSeconds) {
          setCooldown(result.cooldownSeconds);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while communicating with the authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="glass-dark"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#0B1626',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(212, 175, 55, 0.15)',
          padding: '30px 26px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '2px solid var(--accent-gold)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              boxShadow: '0 4px 14px rgba(212,175,55,0.25)',
            }}
          >
            <Mail size={26} />
          </div>
          <h3 style={{ color: '#F8FAFC', fontSize: '1.35rem', fontWeight: '800', margin: '0 0 6px 0' }}>
            {role === 'admin' ? 'Administrator Password Reset' : 'Student Password Reset'}
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0, lineHeight: '1.4' }}>
            Enter your registered email address to receive an official password reset link.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: '1.45',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Clean Success Alert: Only tells user link was sent to their email */}
        {successMsg && (
          <div
            style={{
              marginBottom: '18px',
              padding: '14px 16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10B981',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem',
              color: '#6EE7B7',
              lineHeight: '1.5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#10B981' }} />
            <div>
              <strong style={{ display: 'block', color: '#FFFFFF', marginBottom: '2px' }}>
                Link Sent to Email
              </strong>
              {successMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSendEmail}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.86rem' }}>
              {role === 'admin' ? 'Administrator Email' : 'Student Registered Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input input-with-icon-left"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  const rem = RealEmailAuth.getRemainingCooldown(e.target.value);
                  setCooldown(rem);
                }}
                placeholder="Enter your email here"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                }}
                required
                autoFocus
                autoComplete="off"
              />
              <Mail
                size={18}
                className="form-icon-left"
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '6px' }}>
              {role === 'admin' ? (
                'Enter the official administrator email address to receive the password reset link.'
              ) : (
                'Must match the email address registered in the library student directory.'
              )}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '20px',
              fontSize: '0.76rem',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Shield size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
            <span>
              Reset links are valid for 60 minutes and must be clicked from your email inbox. Be sure to check your <strong>Spam folder</strong>.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="btn-gold"
              disabled={loading || cooldown > 0 || !emailInput.trim()}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '0.92rem',
                opacity: loading || cooldown > 0 || !emailInput.trim() ? 0.6 : 1,
                cursor: loading || cooldown > 0 || !emailInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RefreshCw size={15} className="spin" /> Sending Link...
                </span>
              ) : cooldown > 0 ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={15} /> Wait {cooldown}s to Resend
                </span>
              ) : successMsg ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Resend Password Reset Link <Send size={15} />
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Send Password Reset Link <Send size={15} />
                </span>
              )}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '12px 18px' }}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
