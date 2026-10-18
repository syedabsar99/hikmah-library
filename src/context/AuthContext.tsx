import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CurrentUser, MemberProfile } from '../types';
import { DataService } from '../services/dataService';
import { OtpService } from '../services/otpService';
import { validatePasswordPolicy } from '../utils/validation';

interface AuthContextType {
  currentUser: CurrentUser | null;
  currentMemberProfile: MemberProfile | null;
  isAdmin: boolean;
  isMember: boolean;
  isAdminProvisioned: boolean;
  provisionMasterAdmin: (email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginMember: (emailOrIdentifier: string, passcode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateAdminPasswordWithOtp: (phoneNumber: string, newPassword: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberPasscodeWithOtp: (phoneNumber: string, newPasscode: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  getAdminPhoneNumber: () => string;
  getAdminEmail: () => string;
  adminPhone: string;
  adminEmail: string;
  adminName: string;
  updateAdminCredentials: (newCreds: { name?: string; email?: string; phone?: string; password?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'hikmah_auth_session_v2';
const ADMIN_CREDENTIALS_KEY = 'hikmah_admin_creds_v2';

export const DEFAULT_ADMIN_EMAIL = 'syedabsar99@gmail.com';
export const DEFAULT_ADMIN_PHONE = '9622497806';
export const DEFAULT_ADMIN_PASS = 'HikmahAdmin@2026!';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentMemberProfile, setCurrentMemberProfile] = useState<MemberProfile | null>(null);

  const getAdminCredentials = () => {
    try {
      const item = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          password: parsed.password || DEFAULT_ADMIN_PASS,
          phone: parsed.phone || DEFAULT_ADMIN_PHONE,
          email: parsed.email || DEFAULT_ADMIN_EMAIL,
          name: parsed.name || 'Chief Administrator Syed Absar',
          isProvisioned: true,
        };
      }
    } catch {}
    return {
      password: DEFAULT_ADMIN_PASS,
      phone: DEFAULT_ADMIN_PHONE,
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Chief Administrator Syed Absar',
      isProvisioned: true,
    };
  };

  const [adminCredsState, setAdminCredsState] = useState(() => getAdminCredentials());

  useEffect(() => {
    const handleUpdate = () => {
      setAdminCredsState(getAdminCredentials());
    };
    window.addEventListener('hikmah_admin_creds_updated', handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === ADMIN_CREDENTIALS_KEY) handleUpdate();
    });
    return () => {
      window.removeEventListener('hikmah_admin_creds_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateAdminCredentials = (newCreds: { name?: string; email?: string; phone?: string; password?: string }) => {
    const current = getAdminCredentials();
    const updated = {
      ...current,
      ...newCreds,
      isProvisioned: true,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updated));
    setAdminCredsState(updated);
    window.dispatchEvent(new CustomEvent('hikmah_admin_creds_updated', { detail: updated }));
  };

  // Sync profile when member is logged in and monitor for instant deletion by admin
  useEffect(() => {
    if (currentUser?.role !== 'member' || !currentUser.memberId) {
      setCurrentMemberProfile(null);
      return;
    }

    const verifyMemberStatus = async () => {
      const profile = await DataService.getMemberById(currentUser.memberId!);
      if (!profile) {
        // Immediately purged from directory by admin!
        alert('Your library membership account has been terminated by administration. You have been logged out immediately.');
        logout();
        return;
      }
      setCurrentMemberProfile(profile);
      if (profile.membershipStatus === 'Cancelled') {
        alert('Your registration has been cancelled by administration. Logging out.');
        logout();
      }
    };

    verifyMemberStatus();

    // Check periodically every 3 seconds to catch real-time admin deletion immediately
    const interval = setInterval(verifyMemberStatus, 3000);

    const handleMemberDeleted = (e: any) => {
      if (e.detail?.memberId === currentUser.memberId) {
        alert('Your library membership account has been terminated by administration. You have been logged out immediately.');
        logout();
      }
    };

    window.addEventListener('hikmah_member_deleted', handleMemberDeleted);
    window.addEventListener('storage', verifyMemberStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hikmah_member_deleted', handleMemberDeleted);
      window.removeEventListener('storage', verifyMemberStatus);
    };
  }, [currentUser]);

  const refreshProfile = async () => {
    if (currentUser?.role === 'member' && currentUser.memberId) {
      const p = await DataService.getMemberById(currentUser.memberId);
      if (p) setCurrentMemberProfile(p);
    }
  };

  const getAdminPhoneNumber = (): string => {
    const creds = getAdminCredentials();
    return creds.phone || '9622497806';
  };

  const getAdminEmail = (): string => {
    const creds = getAdminCredentials();
    return creds.email || 'syedabsar99@gmail.com';
  };

  // ADMIN LOGIN: Accessible via Email (syedabsar99@gmail.com) or Phone / Username
  const loginAdmin = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedInput = (identifier || '').trim();
    if (!trimmedInput) {
      return { success: false, error: 'Please enter your administrator email address.' };
    }

    const storedCreds = getAdminCredentials();
    const storedEmail = (storedCreds.email || 'syedabsar99@gmail.com').toLowerCase();
    const cleanStoredPhone = (storedCreds.phone || '9622497806').replace(/[^0-9]/g, '');

    // Check matching email
    const isEmail = trimmedInput.includes('@');
    const isMatchingEmail =
      trimmedInput.toLowerCase() === storedEmail ||
      trimmedInput.toLowerCase() === 'syedabsar99@gmail.com' ||
      trimmedInput.toLowerCase() === 'admin@hikmahlibrary.com';

    // Check matching phone or username (backwards compatibility)
    const cleanInputDigits = trimmedInput.replace(/[^0-9]/g, '');
    const isMatchingPhone =
      cleanInputDigits.length >= 7 &&
      (cleanInputDigits === cleanStoredPhone ||
        cleanInputDigits === '9622497806' ||
        cleanStoredPhone.endsWith(cleanInputDigits.slice(-10)));
    const isMatchingUsername =
      trimmedInput.toLowerCase() === 'hikmahadm' || trimmedInput.toLowerCase() === 'admin';

    if (!isMatchingEmail && !isMatchingPhone && !isMatchingUsername) {
      return {
        success: false,
        error: isEmail
          ? `The email "${trimmedInput}" is not registered as an authorized library administrator. Only authorized admin email (${storedEmail}) is permitted.`
          : `The identifier "${trimmedInput}" is not registered as an authorized administrator. Please sign in with your admin email (${storedEmail}).`,
      };
    }

    if (!storedCreds.password || !storedCreds.isProvisioned) {
      return {
        success: false,
        error: 'Administrator master password has not been provisioned yet. Please provision your master password.',
      };
    }

    if (password !== storedCreds.password) {
      return { success: false, error: 'Incorrect administrator password.' };
    }

    const adminUser: CurrentUser = {
      uid: 'admin-chief-001',
      role: 'admin',
      name: 'Chief Administrator Syed Absar',
      email: storedEmail,
      phoneNumber: storedCreds.phone || '9622497806',
    };

    setCurrentUser(adminUser);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));

    await DataService.addAuditLog(
      'ADMIN_LOGIN',
      'AUTH',
      `Administrator signed in using verified identity ${trimmedInput}.`,
      'Chief Administrator Syed Absar'
    );

    return { success: true };
  };

  // PROVISION MASTER ADMINISTRATOR PASSWORD (SECURE FIRST-TIME SETUP)
  const provisionMasterAdmin = async (
    email: string,
    password: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid administrator email address.' };
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return { success: false, error: 'Password Policy: ' + policy.errors.join(' • ') };
    }

    const newCreds = {
      email: trimmedEmail,
      password: password,
      phone: phone ? phone.replace(/[^0-9]/g, '') : '9622497806',
      name: 'Chief Administrator',
      isProvisioned: true,
      provisionedAt: new Date().toISOString(),
    };

    localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(newCreds));
    setAdminCredsState(newCreds);
    window.dispatchEvent(new CustomEvent('hikmah_admin_creds_updated', { detail: newCreds }));

    await DataService.addAuditLog(
      'ADMIN_PROVISIONED',
      'AUTH',
      `Master Administrator credentials securely provisioned for ${trimmedEmail}.`,
      'System Security'
    );

    return { success: true };
  };

  // STUDENT / MEMBER LOGIN: Authenticates via Registered Email & Password / Passcode
  const loginMember = async (
    emailOrIdentifier: string,
    passcode: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedInput = (emailOrIdentifier || '').trim();
    if (!trimmedInput) {
      return { success: false, error: 'Please enter your registered student email address.' };
    }

    let member: MemberProfile | undefined;

    if (trimmedInput.includes('@')) {
      // Look up member by registered email
      member = await DataService.getMemberByEmail(trimmedInput);
      if (!member) {
        return {
          success: false,
          error: `Email "${trimmedInput}" is not registered in the Hikmah Library member directory. Only students registered by the administrator can access the student portal. Please contact library administration to register.`,
        };
      }
    } else {
      // Fallback for phone numbers or student IDs
      const cleanDigits = trimmedInput.replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) {
        member = await DataService.getMemberByPhone(cleanDigits);
      } else {
        member = (await DataService.getMemberById(trimmedInput)) || undefined;
      }

      if (!member) {
        return {
          success: false,
          error: `Identifier "${trimmedInput}" is not registered in Hikmah Library member directory. Please sign in with your registered email address.`,
        };
      }
    }

    // Password / Passcode verification strictly against member's registered password
    if (!member.passcode) {
      return {
        success: false,
        error: 'No password has been configured for this student account yet. Please switch to "New Student? Activate Account / Set Password" to configure your portal access.',
      };
    }

    if (passcode.trim() !== member.passcode) {
      return {
        success: false,
        error: 'Incorrect password for this student account. Use "Forgot Password? Reset via Email Link" to set a new password.',
      };
    }

    // Check account status
    if (member.membershipStatus === 'Cancelled') {
      return {
        success: false,
        error: 'Registration Cancelled: This account was deactivated due to disciplinary review (10 Warnings reached). Please contact the Director of Hikmah Library.',
      };
    }

    if (member.membershipStatus === 'Suspended') {
      return {
        success: false,
        error: 'Account Suspended: Your access has been temporarily restricted. Please visit the front desk.',
      };
    }

    const user: CurrentUser = {
      uid: member.uid || `uid-${member.id}`,
      role: 'member',
      memberId: member.id,
      name: member.fullName,
      email: member.email,
      phoneNumber: member.phoneNumber,
    };

    setCurrentUser(user);
    setCurrentMemberProfile(member);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    await DataService.addAuditLog(
      'MEMBER_LOGIN',
      'AUTH',
      `Member ${member.fullName} (${member.id}) authenticated via registered email ${member.email}.`,
      member.fullName,
      member.id
    );

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      DataService.addAuditLog(
        'LOGOUT',
        'AUTH',
        `User ${currentUser.name} signed out.`,
        currentUser.name
      );
    }
    setCurrentUser(null);
    setCurrentMemberProfile(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // ADMIN PASSWORD RESET VIA OTP TO ADMIN PHONE NUMBER OR EMAIL
  const updateAdminPasswordWithOtp = async (
    phoneNumber: string,
    newPassword: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, error: 'Password Policy: ' + policy.errors.join(' • ') };
    }

    const verifyResult = OtpService.verifyOtp(phoneNumber, otp);
    if (!verifyResult.success) {
      return verifyResult;
    }

    try {
      const creds = getAdminCredentials();
      creds.password = newPassword;
      creds.phone = phoneNumber.trim();
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(creds));

      await DataService.addAuditLog(
        'ADMIN_PASSWORD_RESET',
        'AUTH',
        `Administrator portal password changed successfully via verified OTP to ${phoneNumber}.`,
        'Chief Librarian'
      );

      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update credentials in storage.' };
    }
  };

  // STUDENT PASSCODE RESET VIA OTP TO REGISTERED MOBILE NUMBER
  const updateMemberPasscodeWithOtp = async (
    phoneNumber: string,
    newPasscode: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    const policy = validatePasswordPolicy(newPasscode);
    if (!policy.valid) {
      return { success: false, error: 'Passcode Policy: ' + policy.errors.join(' • ') };
    }

    const member = await DataService.getMemberByPhone(phoneNumber);
    if (!member) {
      return {
        success: false,
        error: `Mobile number "${phoneNumber}" is not registered in Hikmah Library member directory.`,
      };
    }

    const verifyResult = OtpService.verifyOtp(phoneNumber, otp);
    if (!verifyResult.success) {
      return verifyResult;
    }

    const updated = await DataService.updateMemberPasscode(phoneNumber, newPasscode.trim());
    if (!updated) {
      return { success: false, error: 'Failed to update passcode in database.' };
    }

    await DataService.addAuditLog(
      'MEMBER_PASSCODE_RESET',
      'AUTH',
      `Student ${member.fullName} (${member.id}) changed passcode via verified mobile OTP.`,
      member.fullName,
      member.id
    );

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentMemberProfile,
        isAdmin: currentUser?.role === 'admin',
        isMember: currentUser?.role === 'member',
        isAdminProvisioned: Boolean(adminCredsState.isProvisioned && adminCredsState.password),
        provisionMasterAdmin,
        loginAdmin,
        loginMember,
        logout,
        updateAdminPasswordWithOtp,
        updateMemberPasscodeWithOtp,
        refreshProfile,
        getAdminPhoneNumber,
        getAdminEmail,
        adminPhone: adminCredsState.phone || '9622497806',
        adminEmail: adminCredsState.email || 'syedabsar99@gmail.com',
        adminName: adminCredsState.name || 'Chief Administrator',
        updateAdminCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const defaultAuthContext: AuthContextType = {
  currentUser: null,
  currentMemberProfile: null,
  isAdmin: false,
  isMember: false,
  isAdminProvisioned: false,
  provisionMasterAdmin: async () => ({ success: false, error: 'Authentication initializing' }),
  adminPhone: '9622497806',
  adminEmail: 'syedabsar99@gmail.com',
  adminName: 'Chief Administrator',
  loginAdmin: async () => ({ success: false, error: 'Authentication initializing' }),
  loginMember: async () => ({ success: false, error: 'Authentication initializing' }),
  logout: () => {},
  updateAdminPasswordWithOtp: async () => ({ success: false, error: 'Authentication initializing' }),
  updateMemberPasscodeWithOtp: async () => ({ success: false, error: 'Authentication initializing' }),
  refreshProfile: async () => {},
  getAdminPhoneNumber: () => '9622497806',
  getAdminEmail: () => 'syedabsar99@gmail.com',
  updateAdminCredentials: () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
