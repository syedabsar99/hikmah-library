import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';
import { EmailPasswordResetModal } from '../components/EmailPasswordResetModal';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebase';
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
  ShieldCheck,
} from 'lucide-react';

interface MemberLoginProps {
  onNavigate: (view: string) => void;
  onSuccess: () => void;
}

export const MemberLogin: React.FC<MemberLoginProps> = ({ onNavigate, onSuccess }) => {
  const { loginMember } = useAuth();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sign In State
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

  // First-Time Registration State (Directory-Gated)
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [unregisteredEmailPrompt, setUnregisteredEmailPrompt] = useState<string | null>(null);

  // Email Password Reset Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setUnregisteredEmailPrompt(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered student email address.');
      setLoading(false);
      return;
    }

    try {
      // 1. Verify if this student is enrolled in the library directory
      const member = await DataService.getMemberByEmail(cleanEmail);
      if (!member) {
        setError(
          `Email "${cleanEmail}" is not registered in the Hikmah Library member directory. Please verify your admission email or contact library administration to enroll.`
        );
        setLoading(false);
        return;
      }

      // 2. Check if the student has not registered / configured a password yet
      if (!member.passcode && !member.hasRegistered) {
        setUnregisteredEmailPrompt(cleanEmail);
        setError(
          `Welcome, ${member.fullName}! You are enrolled in the library directory, but you must register and set your password first before signing in.`
        );
        setLoading(false);
        return;
      }

      // 3. Attempt authentication
      const result = await loginMember(cleanEmail, password);
      if (result.success) {
        try {
          localStorage.setItem('hikmah_saved_member_email', cleanEmail);
        } catch {}
        onSuccess();
      } else {
        if (
          result.error &&
          (result.error.includes('No password has been configured') ||
            result.error.includes('user-not-found') ||
            result.error.includes('not recognized'))
        ) {
          setUnregisteredEmailPrompt(cleanEmail);
          setError(
            `Welcome, ${member.fullName}! You are enrolled in the directory, but you must register and choose your password first.`
          );
        } else {
          setError(result.error || 'Failed to authenticate student. Verify your registered email address and password.');
        }
      }
    } catch {
      setError('An error occurred during member authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Account Registration (Directory-Gated)
  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setRegError('Please provide the valid student email address registered during your admission.');
      return;
    }

    if (!regPassword) {
      setRegError('Please choose a password for your student portal account.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setRegLoading(true);

    try {
      // 1. Check directory strictly - DO NOT auto-provision unknown emails!
      const member = await DataService.getMemberByEmail(cleanEmail);
      if (!member) {
        setRegError(
          `Email "${cleanEmail}" is not registered in the Hikmah Library directory. Please use the exact email address the administrator registered for you during admission, or contact the front desk to enroll first.`
        );
        setRegLoading(false);
        return;
      }

      // 2. Commit new password to Firebase Auth if configured, and to member profile
      const auth = getFirebaseAuth();
      let userUid = member.uid;
      if (auth && isFirebaseConfigured()) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
          userUid = userCred.user.uid;
          await DataService.updateMember(
            member.id,
            { passcode: regPassword, uid: userUid, hasRegistered: true },
            'Student First-Time Registration & UID Sync'
          );
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/email-already-in-use') {
            await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
            await DataService.updateMember(
              member.id,
              { passcode: regPassword, hasRegistered: true },
              'Student Password Update'
            );
          } else {
            console.warn('Firebase account activation notice:', fbErr);
            await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
            await DataService.updateMember(
              member.id,
              { passcode: regPassword, hasRegistered: true },
              'Student Password Update'
            );
          }
        }
      } else {
        const updated = await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
        if (!updated) {
          setRegError('Failed to configure password. Please try again or contact administration.');
          setRegLoading(false);
          return;
        }
        await DataService.updateMember(
          member.id,
          { passcode: regPassword, hasRegistered: true },
          'Student Password Update'
        );
      }

      // 3. Success - Pre-fill sign in form and return student to login view
      setEmail(cleanEmail);
      setPassword(regPassword);
      try {
        localStorage.setItem('hikmah_saved_member_email', cleanEmail);
      } catch {}

      setSuccessMessage(
        `Registration complete for ${member.fullName}! Your password has been configured. Please click "Sign In to Student Portal" below.`
      );
      setRegPassword('');
      setRegConfirmPassword('');
      setUnregisteredEmailPrompt(null);
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

            {/* First-Time Notice Banner */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#FEF3C7' }}>
                <UserPlus size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
                <span>First time logging in after admission?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMessage(null);
                  setRegEmail(email);
                }}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Register &amp; Set Password →
              </button>
            </div>

            {/* Success Message */}
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
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
                  <div>{error}</div>
                </div>

                {unregisteredEmailPrompt && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <button
                      type="button"
                      className="btn-gold"
                      onClick={() => {
                        setMode('register');
                        setRegEmail(unregisteredEmailPrompt);
                        setError(null);
                        setUnregisteredEmailPrompt(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 16px',
                        fontSize: '0.86rem',
                        fontWeight: '700',
                        justifyContent: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <UserPlus size={16} /> Register &amp; Set Your Password Now
                    </button>
                  </div>
                )}
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
                    placeholder="Enter your registered email"
                    required
                    autoComplete="email"
                  />
                  <Mail size={18} className="form-icon-left" />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Must match the email address recorded upon admission by the librarian.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <label className="form-label" style={{ color: '#E2E8F0', margin: 0 }}>Password</label>
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
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <Lock size={18} className="form-icon-left" />
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
                Enrolled student accessing the portal for the first time?
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
                <UserPlus size={16} /> Register (if first time)
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FIRST-TIME STUDENT REGISTRATION (DIRECTORY-GATED)     */}
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
                Enter the email address registered by the library administrator to choose your portal password.
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

            <form onSubmit={handleActivationSubmit} autoComplete="off">
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  color: '#FEF3C7',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                <span>Only student email addresses pre-registered in the library directory can set up an account.</span>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
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
                    placeholder="e.g. yourname@example.com"
                    required
                  />
                  <Mail size={18} className="form-icon-left" />
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Must match the exact email address the administrator enrolled in the member directory.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>Choose New Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input input-with-icon-left input-with-icon-right"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Enter a secure password (min 6 characters)"
                    required
                  />
                  <Lock size={18} className="form-icon-left" />
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
                    }}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className="form-input input-with-icon-left input-with-icon-right"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                  <Lock size={18} className="form-icon-left" />
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
                    }}
                  >
                    {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-gold"
                disabled={regLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                }}
              >
                {regLoading ? 'Verifying Admission Directory...' : 'Register & Set Password'}
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
                Already registered your password?
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
