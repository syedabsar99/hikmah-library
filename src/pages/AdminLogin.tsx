import React, { useState } from 'react';
import { useAuth, DEFAULT_ADMIN_EMAIL } from '../context/AuthContext';
import { EmailPasswordResetModal } from '../components/EmailPasswordResetModal';
import { Shield, Lock, Mail, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate, onSuccess }) => {
  const { loginAdmin, adminEmail } = useAuth();

  // Pre-fill with official admin email for convenience and clarity
  const [email, setEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('hikmah_saved_admin_email');
      if (!saved || saved.toLowerCase() === 'syedabsar99@gmail.com') {
        localStorage.setItem('hikmah_saved_admin_email', DEFAULT_ADMIN_EMAIL);
        return DEFAULT_ADMIN_EMAIL;
      }
      return saved || adminEmail || DEFAULT_ADMIN_EMAIL;
    } catch {
      return adminEmail || DEFAULT_ADMIN_EMAIL;
    }
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('hikmah_saved_admin_email');
      if (!saved || saved.toLowerCase() === 'syedabsar99@gmail.com') {
        localStorage.setItem('hikmah_saved_admin_email', DEFAULT_ADMIN_EMAIL);
        setEmail(DEFAULT_ADMIN_EMAIL);
      }
    } catch {}
  }, []);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email Password Reset Modal
  const [showEmailModal, setShowEmailModal] = useState(false);

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
        setError(result.error || 'Authentication failed. Please check your admin credentials.');
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
          border: '1px solid rgba(212, 175, 55, 0.35)',
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
          <h2 style={{ color: '#FFFFFF', fontSize: '1.6rem', marginBottom: '6px', fontWeight: '800' }}>
            Administration Console
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
            Authorized Administrator Access ({adminEmail || DEFAULT_ADMIN_EMAIL})
          </p>
        </div>

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
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: '1.45',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
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
                placeholder="hikmahlibrary6@gmail.com"
                required
                autoComplete="email"
              />
              <Mail size={18} className="form-icon-left" />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '4px' }}>
              Restricted to registered library administrator: {adminEmail || DEFAULT_ADMIN_EMAIL}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              <label className="form-label" style={{ color: '#E2E8F0', margin: 0 }}>
                Administrator Password
              </label>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-gold)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: '600',
                }}
              >
                Forgot Password? Send Reset Link
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
                placeholder="Enter administrator password"
                required
                autoComplete="current-password"
              />
              <Lock size={18} className="form-icon-left" />
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
            {loading ? 'Authenticating...' : 'Sign In as Administrator'}
          </button>
        </form>
      </div>

      {/* EMAIL PASSWORD RESET MODAL */}
      <EmailPasswordResetModal
        isOpen={showEmailModal}
        role="admin"
        initialEmail={email}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
};
