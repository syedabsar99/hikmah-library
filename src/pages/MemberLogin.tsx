import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';
import { OtpService, type OtpDispatchResult } from '../services/otpService';
import { EmailPasswordResetModal } from '../components/EmailPasswordResetModal';
import { PasswordResetModal } from '../components/PasswordResetModal';
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
  KeyRound,
  ShieldCheck,
  MessageSquare,
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

  // First-Time Registration Multi-Step State
  // Step 1: 'verify_info' -> Step 2: 'verify_otp' -> Step 3: 'set_password'
  const [regStep, setRegStep] = useState<'verify_info' | 'verify_otp' | 'set_password'>('verify_info');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [otpDispatchData, setOtpDispatchData] = useState<OtpDispatchResult | null>(null);
  const [verifiedMemberName, setVerifiedMemberName] = useState<string>('');

  // Password Reset Modals State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

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

  // Step 1: Verify Directory Admission & Dispatch OTP
  const handleVerifyAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRegError('Please provide your valid student email address registered during admission.');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setRegError('Please provide your valid 10-digit mobile number registered during admission.');
      return;
    }

    setRegLoading(true);

    try {
      // 1. Look up student in directory by email
      const member = await DataService.getMemberByEmail(cleanEmail);

      if (!member) {
        setRegError(
          `Access Denied: The email "${cleanEmail}" was not found in the library directory. Only students whose admission was recorded by library administration can activate portal access. Please contact the front desk or director.`
        );
        setRegLoading(false);
        return;
      }

      // 2. Strict contact number match verification
      const memberCleanPhone = member.phoneNumber.replace(/\D/g, '').slice(-10);
      if (memberCleanPhone !== cleanPhone) {
        setRegError(
          `Access Denied: Mobile number (+91 ${cleanPhone}) does not match the registered contact phone on file for "${member.fullName}". Both registered email and phone number must match directory records.`
        );
        setRegLoading(false);
        return;
      }

      // 3. Dispatch genuine OTP to verified student phone & email
      const dispatch = OtpService.generateOtp(cleanPhone, member.fullName);
      setOtpDispatchData(dispatch);
      setVerifiedMemberName(member.fullName);
      setRegStep('verify_otp');
    } catch (err: any) {
      setRegError(err?.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);
    const result = OtpService.verifyOtp(cleanPhone, regOtp);

    if (!result.success) {
      setRegError(result.error || 'Incorrect or expired verification code. Please check your phone / email.');
      return;
    }

    // OTP Verified successfully! Move to password creation
    setRegStep('set_password');
  };

  // Step 3: Commit Password & Complete Activation
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();

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
      const updated = await DataService.updateMemberPasswordByEmail(cleanEmail, regPassword);
      if (!updated) {
        setRegError('Failed to update student password. Please try again or contact administration.');
        setRegLoading(false);
        return;
      }

      // Prepopulate login form and return to login view
      setEmail(cleanEmail);
      setPassword(regPassword);
      try {
        localStorage.setItem('hikmah_saved_member_email', cleanEmail);
      } catch {}

      setSuccessMessage(
        `Account activated successfully for ${verifiedMemberName || 'Student'}! Your password has been set. Please sign in below.`
      );
      setRegStep('verify_info');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegOtp('');
      setMode('login');
    } catch {
      setRegError('An unexpected error occurred during password configuration.');
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

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-gold)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                }}
              >
                <KeyRound size={14} /> Alternative: Reset via Mobile OTP
              </button>
            </div>

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
                Admitted student accessing the portal for the first time?
              </div>
              <button
                type="button"
                id="member-register-now-btn"
                onClick={() => {
                  setMode('register');
                  setRegStep('verify_info');
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
                <UserPlus size={16} /> Activate Account / Set Password
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FIRST-TIME STUDENT ACTIVATION (DIRECTORY-GATED + OTP) */}
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
                Strictly restricted to enrolled students. Verify your admission credentials to set your password.
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

            {/* STEP 1: VERIFY DIRECTORY INFO (EMAIL + PHONE) */}
            {regStep === 'verify_info' && (
              <form onSubmit={handleVerifyAdmission} autoComplete="off">
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
                  <span>Only registered emails and phone numbers in the library directory can open an account.</span>
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

                <div className="form-group" style={{ marginBottom: '22px' }}>
                  <label className="form-label" style={{ color: '#E2E8F0' }}>
                    Registered Mobile Contact Number *
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
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {regLoading ? 'Checking Directory...' : 'Verify Admission & Send OTP →'}
                </button>
              </form>
            )}

            {/* STEP 2: VERIFY 6-DIGIT OTP */}
            {regStep === 'verify_otp' && otpDispatchData && (
              <form onSubmit={handleVerifyOtp} autoComplete="off">
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid #10B981',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    fontSize: '0.84rem',
                    color: '#6EE7B7',
                    marginBottom: '18px',
                    lineHeight: '1.45',
                  }}
                >
                  <strong>Admission Verified for {verifiedMemberName}!</strong>
                  <div style={{ marginTop: '4px', color: '#FFFFFF', fontSize: '0.8rem' }}>
                    Verification code generated for your contact ({otpDispatchData.maskedDestination}).
                  </div>
                </div>

                {/* WhatsApp & SMS 1-Click Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                  <a
                    href={otpDispatchData.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      background: 'rgba(37, 211, 102, 0.15)',
                      border: '1px solid #25D366',
                      color: '#25D366',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <MessageSquare size={16} /> Send via WhatsApp
                  </a>
                  <a
                    href={otpDispatchData.smsUrl}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid #3B82F6',
                      color: '#93C5FD',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <Phone size={16} /> Send via SMS
                  </a>
                </div>

                <div className="form-group" style={{ marginBottom: '22px' }}>
                  <label className="form-label" style={{ color: '#E2E8F0' }}>
                    Enter 6-Digit Verification Code *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input input-with-icon-left"
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 123456"
                      required
                      autoFocus
                      maxLength={6}
                      style={{ letterSpacing: '0.2em', fontSize: '1.1rem', fontWeight: '700' }}
                    />
                    <KeyRound size={18} className="form-icon-left" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  disabled={regOtp.length < 6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    opacity: regOtp.length < 6 ? 0.6 : 1,
                  }}
                >
                  Verify Code &amp; Continue →
                </button>
              </form>
            )}

            {/* STEP 3: CONFIGURE SECURE PASSWORD */}
            {regStep === 'set_password' && (
              <form onSubmit={handleSetPassword} autoComplete="off">
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid #10B981',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: '#6EE7B7',
                    marginBottom: '18px',
                  }}
                >
                  ✓ Identity verified! Choose a private password for your account.
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
                      autoFocus
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
                  {regLoading ? 'Committing Password...' : 'Save Password & Complete Activation'}
                </button>
              </form>
            )}

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
                  setRegStep('verify_info');
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

      {/* MEMBER PHONE OTP MODAL */}
      <PasswordResetModal
        isOpen={showPhoneModal}
        role="member"
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
