import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';
import { EmailPasswordResetModal } from '../components/EmailPasswordResetModal';
import {
  UserCheck,
  Lock,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';

interface MemberLoginProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export const MemberLogin: React.FC<MemberLoginProps> = ({ onNavigate, onSuccess }) => {
  const { loginMember } = useAuth();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sign In State - ALWAYS initialized to empty string (no dummy values)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear any old hardcoded dummy email from previous sessions on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('hikmah_saved_member_email');
      if (saved && (saved.includes('syed') || saved.includes('noor') || saved.includes('absar'))) {
        localStorage.removeItem('hikmah_saved_member_email');
      }
    } catch {}
  }, []);

  // First-Time Registration State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Email Password Reset Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await loginMember(email, password);
      if (result.success) {
        if (email.trim()) {
          try {
            localStorage.setItem('hikmah_saved_member_email', email.trim().toLowerCase());
          } catch {}
        }
        onSuccess();
      } else {
        setError(result.error || 'Failed to authenticate student. Verify your registered email address and password.');
      }
    } catch {
      setError('An error occurred during member authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Handle First-Time Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setRegError('Please provide your student email address registered during library admission.');
      return;
    }

    if (!regPassword) {
      setRegError('Please choose a password for your portal account.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    setRegLoading(true);

    try {
      // STEP 1: Verify whether the student email exists in the admin directory
      const member = await DataService.getMemberByEmail(cleanEmail);

      if (!member) {
        setRegError(
          `The email address "${cleanEmail}" is not found in the library directory. Only students whose email was registered by library administration during admission can activate portal access. Please contact the front desk or administrator.`
        );
        setRegLoading(false);
        return;
      }

      // STEP 2: Commit new password to member profile
      const updated = await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
      if (!updated) {
        setRegError('Failed to update student password. Please try again or contact administration.');
        setRegLoading(false);
        return;
      }

      // STEP 3: Sync credentials to server auth state for instant cross-device reset & login
      await fetch('/api/auth/member-creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, passcode: regPassword }),
      }).catch(() => {});

      // STEP 4: Success - prepopulate sign in form and return student to login view
      setEmail(cleanEmail);
      setPassword(regPassword);
      try {
        localStorage.setItem('hikmah_saved_member_email', cleanEmail);
      } catch {}
      setSuccessMessage(
        `Registration complete for ${member.fullName}! Your password has been set. Please sign in below.`
      );
      setRegPassword('');
      setRegConfirmPassword('');
      setMode('login');
    } catch {
      setRegError('An unexpected error occurred during student registration. Please try again.');
    } finally {
      setRegLoading(false);
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
        background: 'var(--bg-canvas)',
      }}
    >
      <div
        className="glass-dark"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: 'clamp(24px, 5vw, 40px)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
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

        {/* ============================================================== */}
        {/* VIEW 1: MEMBER SIGN IN                                         */}
        {/* ============================================================== */}
        {mode === 'login' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--accent-gold) 0%, #D97706 100%)',
                  color: '#080C14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
                }}
              >
                <UserCheck size={32} />
              </div>
              <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', color: '#F8FAFC', marginBottom: '6px', fontWeight: '800' }}>
                Student Portal Sign In
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Sign in using your email address registered by library administration
              </p>
            </div>

            {/* Success Message (e.g. after first-time registration) */}
            {successMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10B981',
                  color: '#6EE7B7',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: '1.5',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#10B981' }} />
                <div>{successMessage}</div>
              </div>
            )}

            {/* Error Message */}
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
                  lineHeight: '1.5',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>Registered Student Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="member-login-email-input"
                    className="form-input input-with-icon-left"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here"
                    required
                    autoComplete="off"
                    list="member-email-suggestions"
                  />
                  <datalist id="member-email-suggestions">
                    {localStorage.getItem('hikmah_saved_member_email') && (
                      <option value={localStorage.getItem('hikmah_saved_member_email')!} />
                    )}
                  </datalist>
                  <Mail
                    size={18}
                    className="form-icon-left"
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Must match the email address recorded upon admission by the librarian.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <label className="form-label" style={{ color: '#E2E8F0', margin: 0 }}>Password / Passcode</label>
                  <button
                    type="button"
                    id="member-forgot-password-link"
                    onClick={() => setShowEmailModal(true)}
                    style={{
                      color: 'var(--accent-gold)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Forgot Password? Send Reset Link
                  </button>
                </div>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="member-login-password-input"
                    className="form-input input-with-icon-left input-with-icon-right"
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
                    id="member-toggle-password-visibility-btn"
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
                id="member-sign-in-btn"
                className="btn-gold"
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying Student Directory...' : 'Sign In to Student Portal'}
              </button>
            </form>

            {/* Switch to First-Time Registration Option */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '24px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '6px' }}>
                First time accessing the portal?
              </div>
              <button
                type="button"
                id="member-register-now-btn"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMessage(null);
                  setRegEmail(email);
                }}
                style={{
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UserPlus size={16} /> Register Now (First-Time Activation)
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FIRST-TIME STUDENT REGISTRATION                        */}
        {/* ============================================================== */}
        {mode === 'register' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '26px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                }}
              >
                <UserPlus size={32} />
              </div>
              <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.55rem)', color: '#F8FAFC', marginBottom: '6px', fontWeight: '800' }}>
                First-Time Student Registration
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                Activate your account by verifying your email and choosing your private password
              </p>
            </div>

            {/* Error Message */}
            {regError && (
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
                  lineHeight: '1.5',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
                <div>{regError}</div>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} autoComplete="off">
              {/* Step 1: Registered Student Email */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Registered Student Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="member-reg-email-input"
                    className="form-input input-with-icon-left"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email here"
                    required
                    autoComplete="off"
                    list="member-email-suggestions"
                  />
                  <Mail
                    size={18}
                    className="form-icon-left"
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#93C5FD', marginTop: '4px' }}>
                  ℹ️ Only emails registered by the administrator in the library directory are permitted to register.
                </div>
              </div>

              {/* Step 2: Choose Password */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Choose Your Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    id="member-reg-password-input"
                    className="form-input input-with-icon-left input-with-icon-right"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
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
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showRegPassword ? 'var(--accent-gold)' : '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Step 3: Confirm Password */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Confirm Your Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    id="member-reg-confirm-password-input"
                    className="form-input input-with-icon-left input-with-icon-right"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Enter password again to confirm"
                    required
                    autoComplete="new-password"
                  />
                  <Lock
                    size={18}
                    className="form-icon-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showRegConfirmPassword ? 'var(--accent-gold)' : '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Live Password Match Feedback */}
                {regConfirmPassword.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {regPassword === regConfirmPassword ? (
                      <span style={{ color: '#34D399', fontWeight: '600' }}>✓ Passwords match perfectly</span>
                    ) : (
                      <span style={{ color: '#EF4444', fontWeight: '600' }}>✕ Passwords do not match yet</span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="member-complete-registration-btn"
                className="btn-gold"
                disabled={regLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  opacity: regLoading ? 0.7 : 1,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                }}
              >
                {regLoading ? 'Verifying Student Directory...' : 'Set Password & Complete Registration'}
              </button>
            </form>

            {/* Back to Sign In Option */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '24px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '6px' }}>
                Already set your password?
              </div>
              <button
                type="button"
                id="member-return-to-login-btn"
                onClick={() => {
                  setMode('login');
                  setRegError(null);
                }}
                style={{
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Return to Sign In
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          🔒 Protected Student Portal • Hikmah Library &amp; Study Lounge
        </div>
      </div>

      {/* MEMBER EMAIL PASSWORD RESET MODAL */}
      <EmailPasswordResetModal
        isOpen={showEmailModal}
        role="member"
        initialEmail={email}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
};
