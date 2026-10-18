import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EmailPasswordResetModal } from '../components/EmailPasswordResetModal';
import { PasswordResetModal } from '../components/PasswordResetModal';
import { Shield, Lock, Mail, AlertTriangle, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate, onSuccess }) => {
  const { loginAdmin, adminPhone, isAdminProvisioned, provisionMasterAdmin } = useAuth();
  const cleanAdminPhone = (adminPhone || '9622497806').replace(/[^0-9]/g, '');
  // Admin Login State - ALWAYS initialized to empty string (no dummy values)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Provisioning State (for first-time initial setup without hardcoded passwords)
  const [provEmail, setProvEmail] = useState('syedabsar99@gmail.com');
  const [provPassword, setProvPassword] = useState('');
  const [provConfirmPassword, setProvConfirmPassword] = useState('');
  const [showProvPass, setShowProvPass] = useState(false);
  const [provError, setProvError] = useState<string | null>(null);
  const [provLoading, setProvLoading] = useState(false);

  // Clear any old hardcoded dummy email from previous sessions on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('hikmah_saved_admin_email');
      if (saved && (saved.includes('syed') || saved.includes('absar'))) {
        localStorage.removeItem('hikmah_saved_admin_email');
      }
    } catch {}
  }, []);

  // Email Password Reset Modal
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Fallback Mobile OTP Modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvError(null);

    if (!provEmail.trim() || !provEmail.includes('@')) {
      setProvError('Please enter a valid administrator email address.');
      return;
    }

    if (provPassword !== provConfirmPassword) {
      setProvError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setProvLoading(true);
    try {
      const res = await provisionMasterAdmin(provEmail, provPassword);
      if (!res.success) {
        setProvError(res.error || 'Failed to provision master administrator credentials.');
        setProvLoading(false);
        return;
      }

      // Automatically sign in with newly provisioned credentials
      const loginRes = await loginAdmin(provEmail, provPassword);
      if (loginRes.success) {
        onSuccess();
      } else {
        setProvError(loginRes.error || 'Provisioning succeeded, but sign in failed. Please log in.');
      }
    } catch {
      setProvError('An unexpected error occurred during administrative provisioning.');
    } finally {
      setProvLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAdmin(email, password);
      if (result.success) {
        if (email.trim()) {
          try {
            localStorage.setItem('hikmah_saved_admin_email', email.trim().toLowerCase());
          } catch {}
        }
        onSuccess();
      } else {
        setError(result.error || 'Authentication failed. Please check your admin email and password.');
      }
    } catch {
      setError('An unexpected error occurred during administrative authentication.');
    } finally {
      setLoading(false);
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
        background: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 100%)',
      }}
    >
      <div
        className="glass-dark"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px 32px',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <button
          onClick={() => onNavigate('home')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-gold)',
            fontSize: '0.85rem',
            marginBottom: '24px',
            fontWeight: '600',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Return to Home
        </button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #997312 100%)',
              color: 'var(--primary-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 14px rgba(212,175,55,0.4)',
            }}
          >
            <Shield size={32} />
          </div>
          <h2 style={{ color: '#FFFFFF', fontSize: '1.6rem', marginBottom: '6px' }}>
            Administration Console
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
            Authorized Administrator Email Access
          </p>
        </div>

        {!isAdminProvisioned ? (
          <div>
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                }}
              >
                <KeyRound size={16} /> Initial Security Setup Required
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '0.78rem', lineHeight: '1.4' }}>
                No default production password is pre-configured. Please provision your master administrator password below to initialize access.
              </div>
            </div>

            {provError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{provError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Master Administrator Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input input-with-icon-left"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                    }}
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="Enter admin email here"
                    required
                  />
                  <Mail size={18} className="form-icon-left" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Create Master Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showProvPass ? 'text' : 'password'}
                    className="form-input input-with-icon-left input-with-icon-right"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                    }}
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    placeholder="Minimum 8 characters (letters, numbers, symbols)"
                    required
                  />
                  <Lock size={18} className="form-icon-left" />
                  <button
                    type="button"
                    onClick={() => setShowProvPass(!showProvPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showProvPass ? 'var(--accent-gold)' : '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    {showProvPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Confirm Master Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showProvPass ? 'text' : 'password'}
                    className="form-input input-with-icon-left"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                    }}
                    value={provConfirmPassword}
                    onChange={(e) => setProvConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                  <Lock size={18} className="form-icon-left" />
                </div>
              </div>

              <button
                type="submit"
                className="btn-gold"
                disabled={provLoading}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', opacity: provLoading ? 0.7 : 1 }}
              >
                {provLoading ? 'Initializing Master Credentials...' : 'Provision Master Administrator Account'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Administrator Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input input-with-icon-left"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                    }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here"
                    required
                    autoComplete="off"
                    list="admin-email-suggestions"
                  />
                  <datalist id="admin-email-suggestions">
                    {localStorage.getItem('hikmah_saved_admin_email') && (
                      <option value={localStorage.getItem('hikmah_saved_admin_email')!} />
                    )}
                  </datalist>
                  <Mail
                    size={18}
                    className="form-icon-left"
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '4px' }}>
                  Authorized administrator account access
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ color: '#E2E8F0' }}>
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    style={{
                      color: 'var(--accent-gold)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: '6px',
                    }}
                  >
                    Forgot Password? / Reset via Email
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input input-with-icon-left input-with-icon-right"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#FFFFFF',
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password here"
                    required
                    autoComplete="new-password"
                  />
                  <Lock
                    size={18}
                    className="form-icon-left"
                  />
                  <button
                    type="button"
                    id="admin-toggle-password-visibility-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showPassword ? 'var(--accent-gold)' : '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-gold"
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying Session...' : 'Sign In as Administrator'}
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Alternative: Reset via Phone OTP
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* EMAIL PASSWORD RESET MODAL */}
      <EmailPasswordResetModal
        isOpen={showEmailModal}
        role="admin"
        initialEmail={email}
        onClose={() => setShowEmailModal(false)}
      />

      {/* PHONE OTP MODAL (FALLBACK) */}
      <PasswordResetModal
        isOpen={showPhoneModal}
        role="admin"
        initialPhone={cleanAdminPhone}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={(_, newPass) => {
          if (newPass) {
            setPassword(newPass);
          }
          setShowPhoneModal(false);
        }}
      />
    </div>
  );
};
