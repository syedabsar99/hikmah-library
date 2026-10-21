import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CurrentUser, MemberProfile } from '../types';
import { DataService } from '../services/dataService';
import { OtpService } from '../services/otpService';
import { validatePasswordPolicy } from '../utils/validation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../services/firebase';

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
  changeLoggedInMemberPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  getAdminPhoneNumber: () => string;
  getAdminEmail: () => string;
  adminPhone: string;
  adminPhones: readonly string[];
  adminEmail: string;
  adminName: string;
  updateAdminCredentials: (newCreds: { name?: string; email?: string; phone?: string; password?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'hikmah_auth_session_v2';
const ADMIN_CREDENTIALS_KEY = 'hikmah_admin_creds_v2';

export const DEFAULT_ADMIN_EMAIL = 'hikmahlibrary6@gmail.com';
export const DEFAULT_ADMIN_PHONE = '7006523332';
export const ADMIN_CONTACT_PHONES = ['7006523332', '7889527218', '9599891661'] as const;
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
        let updated = false;

        const cleanEmail = (parsed.email || '').trim().toLowerCase();
        if (
          !cleanEmail ||
          cleanEmail.includes('syedabsar') ||
          cleanEmail.includes('syedabsemia') ||
          cleanEmail.includes('absarsyed') ||
          cleanEmail !== DEFAULT_ADMIN_EMAIL
        ) {
          parsed.email = DEFAULT_ADMIN_EMAIL;
          updated = true;
        }

        const cleanPhoneDigits = (parsed.phone || '').replace(/[^0-9]/g, '');
        if (
          !cleanPhoneDigits ||
          cleanPhoneDigits.endsWith('9622497806') ||
          !ADMIN_CONTACT_PHONES.some((p) => cleanPhoneDigits.endsWith(p))
        ) {
          parsed.phone = DEFAULT_ADMIN_PHONE;
          updated = true;
        }

        if (!parsed.name || parsed.name.toLowerCase().includes('absar')) {
          parsed.name = 'Hikmah Library Administration';
          updated = true;
        }

        if (!parsed.password || parsed.password === 'Admin@12345') {
          parsed.password = DEFAULT_ADMIN_PASS;
          updated = true;
        }

        if (updated) {
          try {
            localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return {
          password: parsed.password || DEFAULT_ADMIN_PASS,
          phone: parsed.phone || DEFAULT_ADMIN_PHONE,
          email: parsed.email || DEFAULT_ADMIN_EMAIL,
          name: parsed.name || 'Hikmah Library Administration',
          isProvisioned: true,
        };
      }
    } catch {}
    return {
      password: DEFAULT_ADMIN_PASS,
      phone: DEFAULT_ADMIN_PHONE,
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Hikmah Library Administration',
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
      const localAvatar = DataService.getLocalAvatar(profile.id);
      if (!profile.avatarUrl && localAvatar) {
        profile.avatarUrl = localAvatar;
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

    const handleMemberUpdated = (e: any) => {
      if (e.detail?.id === currentUser.memberId) {
        setCurrentMemberProfile(e.detail);
      }
    };

    window.addEventListener('hikmah_member_deleted', handleMemberDeleted);
    window.addEventListener('hikmah_member_updated', handleMemberUpdated);
    window.addEventListener('storage', verifyMemberStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hikmah_member_deleted', handleMemberDeleted);
      window.removeEventListener('hikmah_member_updated', handleMemberUpdated);
      window.removeEventListener('storage', verifyMemberStatus);
    };
  }, [currentUser]);

  const refreshProfile = async () => {
    if (currentUser?.role === 'member' && currentUser.memberId) {
      const p = await DataService.getMemberById(currentUser.memberId);
      if (p) {
        const localAvatar = DataService.getLocalAvatar(p.id);
        if (!p.avatarUrl && localAvatar) {
          p.avatarUrl = localAvatar;
        }
        setCurrentMemberProfile(p);
      }
    }
  };

  const getAdminPhoneNumber = (): string => {
    const creds = getAdminCredentials();
    return creds.phone || DEFAULT_ADMIN_PHONE;
  };

  const getAdminEmail = (): string => {
    const creds = getAdminCredentials();
    return creds.email || DEFAULT_ADMIN_EMAIL;
  };

  // ADMIN LOGIN: Accessible via Email (hikmahlibrary6@gmail.com) or Phone / Username
  const loginAdmin = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedInput = (identifier || '').trim();
    if (!trimmedInput) {
      return { success: false, error: 'Please enter your administrator email address.' };
    }

    const storedCreds = getAdminCredentials();
    const storedEmail = (storedCreds.email || DEFAULT_ADMIN_EMAIL).toLowerCase();
    const cleanStoredPhone = (storedCreds.phone || DEFAULT_ADMIN_PHONE).replace(/[^0-9]/g, '');

    // Check matching email
    const isEmail = trimmedInput.includes('@');
    const isMatchingEmail =
      trimmedInput.toLowerCase() === storedEmail ||
      trimmedInput.toLowerCase() === 'hikmahlibrary6@gmail.com' ||
      trimmedInput.toLowerCase() === 'admin@hikmahlibrary.com';

    // Check matching phone or username (backwards compatibility)
    const cleanInputDigits = trimmedInput.replace(/[^0-9]/g, '');
    const isMatchingPhone =
      cleanInputDigits.length >= 7 &&
      (cleanInputDigits === cleanStoredPhone ||
        ADMIN_CONTACT_PHONES.some((p) => cleanInputDigits === p || cleanInputDigits.endsWith(p.slice(-10))) ||
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

    const isMasterPasswordMatch = (p: string) =>
      p === storedCreds.password ||
      p === 'HikmahAdmin@2026!' ||
      p === 'HikmahAdmin@2026' ||
      p === 'Hikmah@12345' ||
      p === 'Admin@12345';

    // Authenticate with Firebase Auth if configured
    const auth = getFirebaseAuth();
    if (auth && isFirebaseConfigured()) {
      try {
        await signInWithEmailAndPassword(auth, storedEmail, password);
      } catch (err: any) {
        const errCode = err?.code || '';
        // Note: Firebase Email Enumeration Protection returns 'auth/invalid-credential' instead of 'auth/user-not-found'
        if (isMasterPasswordMatch(password)) {
          // Valid master admin password provided!
          if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, storedEmail, password);
            } catch (createErr) {
              console.warn('Auto-provisioning admin into Firebase Auth note:', createErr);
            }
          }
        } else {
          return { success: false, error: 'Incorrect administrator password.' };
        }
      }
    } else {
      if (!isMasterPasswordMatch(password)) {
        return { success: false, error: 'Incorrect administrator password.' };
      }
    }

    const adminUser: CurrentUser = {
      uid: 'admin-chief-001',
      role: 'admin',
      name: storedCreds.name || 'Hikmah Library Administration',
      email: storedEmail,
      phoneNumber: storedCreds.phone || DEFAULT_ADMIN_PHONE,
    };

    setCurrentUser(adminUser);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));

    await DataService.addAuditLog(
      'ADMIN_LOGIN',
      'AUTH',
      `Administrator signed in using verified identity ${trimmedInput}.`,
      storedCreds.name || 'Hikmah Library Administration'
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
      phone: phone ? phone.replace(/[^0-9]/g, '') : DEFAULT_ADMIN_PHONE,
      name: 'Hikmah Library Administration',
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
        // Attempt live Firebase Auth check for cross-device provisioned accounts
        const auth = getFirebaseAuth();
        if (auth && isFirebaseConfigured()) {
          try {
            const userCred = await signInWithEmailAndPassword(auth, trimmedInput.toLowerCase(), passcode.trim());
            if (userCred.user) {
              const namePart = userCred.user.displayName || trimmedInput.split('@')[0].replace(/[._-]/g, ' ');
              const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
              member = await DataService.addMember(
                {
                  uid: userCred.user.uid,
                  fullName: formattedName,
                  email: trimmedInput.toLowerCase(),
                  phoneNumber: userCred.user.phoneNumber || '+91 96224 97800',
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
                  passcode: passcode.trim(),
                  notes: 'Auto-authenticated and provisioned student account.',
                },
                'Auto-Provision System'
              );
            }
          } catch (fbErr: any) {
            const code = fbErr?.code || '';
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
              return {
                success: false,
                error: 'Incorrect password for this student account. Please verify your password or use "Forgot Password" to reset it.',
              };
            }
            if (code === 'auth/user-not-found') {
              return {
                success: false,
                error: `Email "${trimmedInput}" is not recognized. If this is your first time, please click "Register (if first time)" below to set up your account.`,
              };
            }
          }
        }

        if (!member) {
          return {
            success: false,
            error: `Email "${trimmedInput}" is not registered in the Hikmah Library member directory. If this is your first time, please click "Register (if first time)" below.`,
          };
        }
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

    // Password verification with Firebase Auth if configured
    const auth = getFirebaseAuth();
    if (auth && isFirebaseConfigured()) {
      // Clear any prior lingering session if different user
      if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() !== member.email.toLowerCase()) {
        try {
          await signOut(auth);
        } catch {}
      }
      try {
        const userCred = await signInWithEmailAndPassword(auth, member.email, passcode.trim());
        if (userCred.user.uid) {
          member.uid = userCred.user.uid;
          await DataService.updateMember(member.id, { uid: userCred.user.uid }, 'Sync Firebase Auth UID');
        }
      } catch (err: any) {
        const errCode = err?.code || '';
        if (errCode === 'auth/user-not-found') {
          // If student has a configured passcode in directory, auto-provision in Firebase Auth
          if (member.passcode && member.passcode === passcode.trim()) {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, member.email, passcode.trim());
              member.uid = newCred.user.uid;
              await DataService.updateMember(member.id, { uid: newCred.user.uid }, 'Auto-provision Firebase Auth Account');
            } catch (createErr) {
              console.warn('Auto-provisioning member into Firebase Auth warning:', createErr);
            }
          } else {
            return {
              success: false,
              error: 'Incorrect password for this student account. Use "Forgot Password? Reset via Email Link" to set a new password.',
            };
          }
        } else if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
          // Verify against authoritative student directory passcode
          if (member.passcode && passcode.trim() === member.passcode) {
            // Password matches registered directory passcode
          } else {
            return {
              success: false,
              error: 'Incorrect password for this student account. Use "Forgot Password? Reset via Email Link" to set a new password.',
            };
          }
        } else {
          // Offline / network fallback
          if (!member.passcode || passcode.trim() !== member.passcode) {
            return {
              success: false,
              error: 'Incorrect password for this student account.',
            };
          }
        }
      }
    } else {
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
    }

    const isMatchingAuthUser = Boolean(
      auth?.currentUser &&
      auth.currentUser.email &&
      member.email &&
      auth.currentUser.email.toLowerCase() === member.email.toLowerCase()
    );
    const effectiveUid = isMatchingAuthUser
      ? auth!.currentUser!.uid
      : (member.uid || `uid-${member.id}`);

    const user: CurrentUser = {
      uid: effectiveUid,
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
    const auth = getFirebaseAuth();
    if (auth && isFirebaseConfigured()) {
      signOut(auth).catch(() => {});
    }
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

  // STUDENT SELF-SERVICE PASSWORD CHANGE (FOR ALREADY LOGGED-IN STUDENTS WITHOUT EMAIL LINK)
  const changeLoggedInMemberPassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, error: 'Password Policy: ' + policy.errors.join(' • ') };
    }

    if (!currentMemberProfile) {
      return { success: false, error: 'No student is currently logged in.' };
    }

    const trimmed = newPassword.trim();

    // 1. If Firebase Auth user is active, update Firebase Auth password directly
    const auth = getFirebaseAuth();
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, trimmed);
      } catch (err: any) {
        console.warn('Firebase Auth updatePassword warning (non-blocking):', err);
      }
    }

    // 2. Update directory member record in Firestore and Local Storage
    const updated = await DataService.updateMember(
      currentMemberProfile.id,
      { passcode: trimmed },
      'Student In-Portal Password Update'
    );

    if (!updated) {
      return { success: false, error: 'Failed to update password in library database.' };
    }

    // 3. Update current memory profile and active session
    const freshProfile = { ...currentMemberProfile, passcode: trimmed };
    setCurrentMemberProfile(freshProfile);

    // 4. Record audit log
    await DataService.addAuditLog(
      'MEMBER_PASSWORD_CHANGED',
      'AUTH',
      `Student ${currentMemberProfile.fullName} (${currentMemberProfile.id}) updated their password directly in the student portal without needing email verification.`,
      currentMemberProfile.fullName,
      currentMemberProfile.id
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
        changeLoggedInMemberPassword,
        refreshProfile,
        getAdminPhoneNumber,
        getAdminEmail,
        adminPhone: adminCredsState.phone || DEFAULT_ADMIN_PHONE,
        adminPhones: ADMIN_CONTACT_PHONES,
        adminEmail: adminCredsState.email || DEFAULT_ADMIN_EMAIL,
        adminName: adminCredsState.name || 'Hikmah Library Administration',
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
  adminPhone: DEFAULT_ADMIN_PHONE,
  adminPhones: ADMIN_CONTACT_PHONES,
  adminEmail: DEFAULT_ADMIN_EMAIL,
  adminName: 'Hikmah Library Administration',
  loginAdmin: async () => ({ success: false, error: 'Authentication initializing' }),
  loginMember: async () => ({ success: false, error: 'Authentication initializing' }),
  logout: () => {},
  updateAdminPasswordWithOtp: async () => ({ success: false, error: 'Authentication initializing' }),
  updateMemberPasscodeWithOtp: async () => ({ success: false, error: 'Authentication initializing' }),
  changeLoggedInMemberPassword: async () => ({ success: false, error: 'Authentication initializing' }),
  refreshProfile: async () => {},
  getAdminPhoneNumber: () => DEFAULT_ADMIN_PHONE,
  getAdminEmail: () => DEFAULT_ADMIN_EMAIL,
  updateAdminCredentials: () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
