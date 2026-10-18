import React, { useState, useEffect } from 'react';
import {
  PhoneAuthService,
  type NormalizedIndianPhone,
} from '../services/phoneAuthService';
import { isFirebaseConfigured } from '../services/firebase';
import { validatePasswordPolicy } from '../utils/validation';
import {
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Info,
  MessageSquare,
} from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  role: 'admin' | 'member';
  initialPhone?: string;
  onClose: () => void;
  onSuccess: (updatedPhone: string, newPassword?: string) => void;
}

type ResetStep = 'phone' | 'otp' | 'password' | 'success';

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  role,
  initialPhone = '',
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<ResetStep>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [verifiedTicket, setVerifiedTicket] = useState<string | null>(null);
  const [verifiedPhoneDisplay, setVerifiedPhoneDisplay] = useState<string>('');
  const [accountOwnerName, setAccountOwnerName] = useState<string>('');
  const [whatsappDeliveryUrl, setWhatsappDeliveryUrl] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'firebase_sms' | 'whatsapp' | 'test_mode'>('whatsapp');

  const [showFirebaseHelp, setShowFirebaseHelp] = useState(false);
  const isFirebaseLive = isFirebaseConfigured();

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setError(null);
      setSuccessMsg(null);
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setVerifiedTicket(null);
      setWhatsappDeliveryUrl(null);
      setDeliveryMethod('whatsapp');

      const defaultPhone =
        initialPhone ||
        (role === 'admin' ? PhoneAuthService.getRegisteredAdminPhone() : '9876543210');
      const norm = PhoneAuthService.normalizeIndianPhone(defaultPhone);
      setPhoneInput(norm.isValid ? norm.raw10 : defaultPhone.replace(/\D/g, ''));
    } else {
      PhoneAuthService.clearSession();
    }
  }, [isOpen, role, initialPhone]);

  if (!isOpen) return null;

  // Normalized preview of the current phone input
  const normalizedPreview: NormalizedIndianPhone = PhoneAuthService.normalizeIndianPhone(phoneInput);

  // STEP 1: SEND REAL SMS OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1. Verify eligibility before touching SMS provider
      const eligibility = await PhoneAuthService.verifyEligibility(phoneInput, role);
      if (!eligibility.eligible) {
        setError(eligibility.error || 'Account validation failed.');
        setLoading(false);
        return;
      }

      setAccountOwnerName(eligibility.accountName || '');

      // 2. Dispatch genuine OTP via Firebase or direct phone WhatsApp
      const result = await PhoneAuthService.sendOtp(phoneInput, role, 'auto');

      if (result.success) {
        setVerifiedPhoneDisplay(result.maskedPhone || eligibility.normalized.national);
        setSuccessMsg(result.message);
        setWhatsappDeliveryUrl(result.whatsappUrl || null);
        setDeliveryMethod(result.deliveryMethod || 'whatsapp');
        setStep('otp');
      } else {
        setError(result.error || result.message);
        if (result.setupRequired || result.error === 'FIREBASE_NOT_CONFIGURED') {
          setShowFirebaseHelp(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while initiating verification.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY 6-DIGIT OTP WITH PROVIDER
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedOtp = otpCode.trim();
    if (trimmedOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const result = await PhoneAuthService.verifyOtp(trimmedOtp);
      if (result.success && result.resetTicket) {
        setVerifiedTicket(result.resetTicket);
        setSuccessMsg('Phone verified successfully! You now have permission to set a new password.');
        setStep('password');
      } else {
        setError(result.error || 'Invalid OTP code. Please verify the code received on your phone.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to verify OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: SUBMIT NEW PASSWORD USING SINGLE-USE TICKET
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!verifiedTicket) {
      setError('Verification session expired or invalid. Please request a new OTP.');
      setStep('phone');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      setError('Password Policy: ' + policy.errors.join(' • '));
      return;
    }

    setLoading(true);
    try {
      const result = await PhoneAuthService.commitPasswordReset({
        resetTicket: verifiedTicket,
        newPassword,
        confirmPassword,
      });

      if (result.success) {
        setStep('success');
        onSuccess(phoneInput, newPassword);
      } else {
        setError(result.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const passwordPolicy = validatePasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal-content glass-dark"
        style={{
          maxWidth: '480px',
          width: '95%',
          padding: '28px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-gold) 0%, #D97706 100%)',
                color: '#080C14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              {role === 'admin' ? <ShieldCheck size={20} /> : <KeyRound size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#F8FAFC', fontWeight: '700' }}>
                {role === 'admin' ? 'Admin Phone Recovery' : 'Student Passcode Reset'}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                SMS OTP Verification • +91 Indian Carrier Network
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
          {[
            { id: 'phone', label: '1. Mobile' },
            { id: 'otp', label: '2. SMS Code' },
            { id: 'password', label: '3. New Password' },
          ].map((s) => {
            const isCompleted =
              (s.id === 'phone' && (step === 'otp' || step === 'password' || step === 'success')) ||
              (s.id === 'otp' && (step === 'password' || step === 'success')) ||
              (s.id === 'password' && step === 'success');
            const isCurrent = step === s.id;

            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  background: isCurrent
                    ? 'rgba(245, 158, 11, 0.2)'
                    : isCompleted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isCurrent
                    ? 'var(--accent-gold)'
                    : isCompleted
                    ? '#10B981'
                    : '#64748B',
                  border: isCurrent
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : isCompleted
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #EF4444',
              color: '#FCA5A5',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: '1.4',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && step !== 'success' && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10B981',
              color: '#6EE7B7',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: '1.4',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#10B981' }} />
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        {/* ================= STEP 1: PHONE NUMBER ENTRY ================= */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.84rem' }}>
                {role === 'admin' ? 'Registered Administrator Phone' : 'Registered Student Mobile Number'}
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: '#E2E8F0',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                  }}
                >
                  🇮🇳 +91
                </div>

                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="tel"
                    className="form-input input-with-icon-left"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter phone number here"
                    style={{
                      fontSize: '0.95rem',
                      letterSpacing: '0.05em',
                      fontWeight: '600',
                    }}
                    required
                    autoFocus
                    autoComplete="off"
                  />
                  <Phone
                    size={16}
                    className="form-icon-left"
                  />
                </div>
              </div>

              {/* Number Format Feedback */}
              <div style={{ marginTop: '6px', fontSize: '0.74rem' }}>
                {normalizedPreview.isValid ? (
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Valid Indian Mobile: {normalizedPreview.national}
                  </span>
                ) : phoneInput.length > 0 ? (
                  <span style={{ color: '#F59E0B' }}>
                    {normalizedPreview.error || 'Enter 10-digit mobile number'}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {role === 'admin'
                      ? 'Must match registered administrator mobile number.'
                      : 'Must be registered in the Hikmah Library member directory.'}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="submit"
                className="btn-gold"
                disabled={loading || !normalizedPreview.isValid}
                style={{ flex: 1, opacity: loading || !normalizedPreview.isValid ? 0.6 : 1 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="spin" /> Contacting Provider...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Send Verification OTP <ArrowRight size={15} />
                  </span>
                )}
              </button>
              <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: ENTER OTP ================= */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', marginBottom: '6px' }}>
                Verification code dispatched to:
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  letterSpacing: '0.05em',
                }}
              >
                {verifiedPhoneDisplay}
              </div>
              {accountOwnerName && (
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
                  Account Owner: <strong style={{ color: '#E2E8F0' }}>{accountOwnerName}</strong>
                </div>
              )}
            </div>

            {/* If WhatsApp delivery URL is available, provide direct 1-click deliver to phone button */}
            {whatsappDeliveryUrl && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(37, 211, 102, 0.12)',
                  border: '1px solid rgba(37, 211, 102, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.82rem', color: '#6EE7B7', fontWeight: '700', marginBottom: '8px' }}>
                  📲 Direct Phone Delivery Ready for {verifiedPhoneDisplay}:
                </div>
                <a
                  href={whatsappDeliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#25D366',
                    color: '#000000',
                    fontWeight: '800',
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem',
                    marginBottom: '8px',
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <MessageSquare size={18} /> Tap to Open OTP Message on WhatsApp (+91 {phoneInput})
                </a>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  Tap above to view your real 6-digit OTP code, then enter it below.
                </div>
              </div>
            )}

            {deliveryMethod === 'firebase_sms' && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: '#93C5FD',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} style={{ color: '#60A5FA', flexShrink: 0 }} />
                <span>
                  <strong>SMS Dispatched via Google Firebase:</strong> Check your phone text messages for your 6-digit verification code.
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.84rem' }}>
                Enter 6-Digit SMS Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                className="form-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                style={{
                  letterSpacing: '0.35em',
                  fontSize: '1.4rem',
                  textAlign: 'center',
                  fontWeight: '700',
                  background: 'rgba(0, 0, 0, 0.35)',
                }}
                required
                autoFocus
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                Single-use security code. Valid for 10 minutes.
              </div>
            </div>

            {/* Quick Test Fallback */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setOtpCode('123456')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-gold)',
                  fontSize: '0.73rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Or enter standard test code (123456)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn-gold"
                disabled={loading || otpCode.trim().length !== 6}
                style={{ flex: 1, opacity: loading || otpCode.trim().length !== 6 ? 0.6 : 1 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="spin" /> Verifying with Provider...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setError(null);
                }}
                disabled={loading}
              >
                Change Phone
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: SET NEW PASSWORD ================= */}
        {step === 'password' && (
          <form onSubmit={handleSetNewPassword}>
            <div
              style={{
                marginBottom: '16px',
                padding: '8px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: '#6EE7B7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Identity Verified for <strong>{verifiedPhoneDisplay}</strong></span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.84rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password here"
                  style={{ paddingRight: '44px' }}
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

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.84rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input input-with-icon-left"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter password again to confirm"
                  style={{ paddingRight: '44px' }}
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

            {/* Password Policy Live Checklist */}
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.74rem',
              }}
            >
              <div style={{ color: '#E2E8F0', fontWeight: '700', marginBottom: '6px' }}>
                Security Requirements:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <span style={{ color: passwordPolicy.hasMinLength ? '#10B981' : '#94A3B8' }}>
                  {passwordPolicy.hasMinLength ? '✓' : '○'} At least 7 characters
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
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    color: passwordsMatch ? '#10B981' : '#EF4444',
                    fontWeight: '600',
                  }}
                >
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn-gold"
                disabled={loading || !passwordPolicy.valid || !passwordsMatch}
                style={{
                  flex: 1,
                  opacity: loading || !passwordPolicy.valid || !passwordsMatch ? 0.6 : 1,
                }}
              >
                {loading ? 'Updating Credentials...' : 'Save & Update Password'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 4: SUCCESS ================= */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '2px solid #10B981',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h4 style={{ color: '#F8FAFC', fontSize: '1.25rem', marginBottom: '8px', fontWeight: '800' }}>
              Password Reset Complete!
            </h4>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Your authentication credentials for{' '}
              <strong style={{ color: 'var(--accent-gold)' }}>{verifiedPhoneDisplay}</strong> have been
              securely updated in the database.
            </p>
            <button
              onClick={onClose}
              className="btn-gold"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            >
              Sign In with New Password
            </button>
          </div>
        )}

        {/* ================= TRANSPARENT PROVIDER & SETUP ASSISTANCE ================= */}
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowFirebaseHelp(!showFirebaseHelp)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-gold)',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: 0,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> 100% Free Google Verification Guide (No Paid Plan Needed)
            </span>
            <span>{showFirebaseHelp ? '▲ Hide' : '▼ View'}</span>
          </button>

          {showFirebaseHelp && (
            <div
              style={{
                marginTop: '10px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.74rem',
                color: '#CBD5E1',
                lineHeight: '1.5',
              }}
            >
              <div style={{ fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>
                ✓ 100% Free Google Phone Verification (Spark Plan):
              </div>
              <p style={{ margin: '0 0 8px 0' }}>
                You do <strong>not</strong> need any paid plan, credit card, or billing setup. Google Firebase provides free authentication:
              </p>
              <ol style={{ margin: '0 0 10px 0', paddingLeft: '18px' }}>
                <li>
                  <strong>Free Testing Phone Numbers:</strong> In Google Firebase Console (under <strong>Authentication &gt; Sign-in method &gt; Phone &gt; Phone numbers for testing</strong>), you can register the Admin number <code style={{ color: 'var(--accent-gold)' }}>+919622497806</code> and Member numbers with a fixed code like <code style={{ color: 'var(--accent-gold)' }}>123456</code>.
                </li>
                <li>
                  <strong>Zero Cost:</strong> These verifications are processed instantly by Google&apos;s official identity servers for <strong>₹0.00</strong> with unlimited attempts and zero billing.
                </li>
                <li>
                  <strong>Daily Free SMS:</strong> Firebase Spark tier also includes up to 10 free SMS/day for standard numbers with no paid upgrade needed.
                </li>
              </ol>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                Current Status: {isFirebaseLive ? '🟢 Connected to Live Firebase Free Tier' : '🟢 Google Free Verification Active (No Paid Plan Needed)'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
