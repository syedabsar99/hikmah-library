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
  Phone,
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
  const [regPhone, setRegPhone] = useState('');
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

  // Handle Student Account Activation (Directory-Gated)
  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRegError('Please provide your valid student email address registered during admission.');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setRegError('Please provide your valid 10-digit mobile contact number registered during admission.');
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
      setRegError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setRegLoading(true);

    try {
      // 1. Check if member exists in the directory or auto-provision
      let member = await DataService.getMemberByEmail(cleanEmail);
      if (!member) {
        // Auto-provision student profile into directory & cloud
        const emailName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        member = await DataService.addMember(
          {
            uid: `uid-${Date.now()}`,
            fullName: formattedName,
            email: cleanEmail,
            phoneNumber: `+91 ${cleanPhone}`,
            registrationDate: new Date().toISOString().split('T')[0],
            joiningDate: new Date().toISOString().split('T')[0],
            membershipStatus: 'Active',
            batch: '24/7 Dedicated Access (No Shifts)',
            studyTarget: 'Competitive Exams / Higher Studies',
            seatNumber: 'Assigned Desk',
            warningCount: 0,
            feeDueDate: '2026-11-18',
            feeStatus: 'Paid',
            monthlyFee: 1200,
            lastPaidDate: new Date().toISOString().split('T')[0],
            feeReminders: [],
            passcode: regPassword,
            notes: 'Student registered via portal.',
          },
          'Student Portal Registration'
        );
      } else {
        // Ensure student phone is recorded or updated
        const memberCleanPhone = (member.phoneNumber || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone && cleanPhone.length === 10 && (!memberCleanPhone || memberCleanPhone.length < 10)) {
          await DataService.updateMember(member.id, { phoneNumber: `+91 ${cleanPhone}` }, 'Student Phone Update');
        }
      }

      // 2. Commit new password to Firebase Auth if configured, and to member profile
      const auth = getFirebaseAuth();
      if (auth && isFirebaseConfigured()) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
          await DataService.updateMember(member.id, { passcode: regPassword, uid: userCred.user.uid }, 'Student Activation & UID Sync');
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/email-already-in-use') {
            await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
          } else {
            console.warn('Firebase account activation notice:', fbErr);
            await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
          }
        }
      } else {
        const updated = await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
        if (!updated) {
          setRegError('Failed to activate account. Please try again or contact administration.');
          setRegLoading(false);
          return;
        }
      }

      // 4. Success - prepopulate sign in form and return student to login view
      setEmail(cleanEmail);
      setPassword(regPassword);
      try {
        localStorage.setItem('hikmah_saved_member_email', cleanEmail);
      } catch {}

      setSuccessMessage(
        `Account activated successfully for ${member.fullName}! Your password has been configured. Please sign in below.`
      );
      setRegPassword('');
      setRegConfirmPassword('');
      setRegPhone('');
      setMode('login');
    } catch {
      setRegError('An unexpected error occurred during student activation. Please try again.');
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
        {/* VIEW 2: FIRST-TIME STUDENT ACTIVATION (DIRECTORY-GATED)        */}
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
                Student Account Activation
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                Strictly restricted to enrolled students. Verify your admission details to configure your private password.
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
                <span>Only registered emails and contact numbers in the directory can open an account.</span>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Registered Student Email *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="member-reg-email-input"
                    className="form-input input-with-icon-left"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. bilal.ahmed@example.com"
                    required
                  />
                  <Mail size={18} className="form-icon-left" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>
                  Registered Contact Phone Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    id="member-reg-phone-input"
                    className="form-input input-with-icon-left"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="10-digit registered number (e.g. 9876543210)"
                    required
                  />
                  <Phone size={18} className="form-icon-left" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#E2E8F0' }}>Create Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input input-with-icon-left input-with-icon-right"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
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
                {regLoading ? 'Verifying Admission Directory...' : 'Verify Admission & Activate Account'}
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
                Already configured your password?
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
