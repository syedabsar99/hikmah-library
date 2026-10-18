import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  type ActionCodeSettings,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DataService } from './dataService';
import { validatePasswordPolicy } from '../utils/validation';

export const OFFICIAL_ADMIN_EMAIL = 'syedabsar99@gmail.com';
export const ADMIN_CREDENTIALS_KEY = 'hikmah_admin_creds_v2';

export const GENERIC_RESET_SUCCESS_MESSAGE =
  'If your email address is registered and configured, a password reset link has been dispatched. Please check your inbox and Spam folder.';

export interface EmailResetDispatchResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  error?: string;
}

export interface VerifyCodeResult {
  success: boolean;
  email?: string;
  role?: 'admin' | 'member';
  error?: string;
}

export interface ConfirmResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

class RealEmailAuthService {
  // 60-second in-memory cooldown tracker by email to prevent abuse
  private cooldowns: Map<string, number> = new Map();

  /**
   * Normalizes and validates standard email format.
   */
  public normalizeEmail(input: string): { isValid: boolean; email: string; error?: string } {
    if (!input || typeof input !== 'string') {
      return { isValid: false, email: '', error: 'Please enter a valid email address.' };
    }
    const trimmed = input.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, email: trimmed, error: 'Invalid email address format.' };
    }
    return { isValid: true, email: trimmed };
  }

  /**
   * Retrieves remaining cooldown seconds for an email (max 60 seconds).
   */
  public getRemainingCooldown(email: string): number {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) return 0;
    const lastSent = this.cooldowns.get(norm.email);
    if (!lastSent) return 0;
    const elapsed = Math.floor((Date.now() - lastSent) / 1000);
    return Math.max(0, 60 - elapsed);
  }

  /**
   * Sets the 60-second cooldown for an email.
   */
  public setCooldown(email: string) {
    const norm = this.normalizeEmail(email);
    if (norm.isValid) {
      this.cooldowns.set(norm.email, Date.now());
    }
  }

  /**
   * Checks if an email is registered as an Administrator.
   */
  public async isAuthorizedAdminEmail(email: string): Promise<boolean> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) return false;

    // 1. Instant check: Known official administrators
    if (
      norm.email === OFFICIAL_ADMIN_EMAIL.toLowerCase() ||
      norm.email === 'admin@hikmahlibrary.com'
    ) {
      return true;
    }

    // 2. Check local administrator cache
    try {
      const item = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.email && parsed.email.toLowerCase() === norm.email) {
          return true;
        }
      }
    } catch {
      // Fallback
    }

    // 3. Optional Cloud Firestore check with 1.5s timeout (never hangs)
    if (isFirebaseConfigured() && db) {
      const activeDb = db;
      try {
        const fetchDoc = async () => {
          const adminDoc = await getDoc(doc(activeDb, 'admin_roles', norm.email));
          return adminDoc.exists() && adminDoc.data()?.role === 'admin';
        };
        const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500));
        return await Promise.race([fetchDoc(), timeout]);
      } catch {
        // Fallback
      }
    }

    return false;
  }

  /**
   * Checks if an email is registered to a Member in the library directory.
   */
  public async isAuthorizedMemberEmail(email: string): Promise<boolean> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) return false;
    try {
      const members = await DataService.getMembers();
      return members.some((m) => m.email?.toLowerCase() === norm.email);
    } catch {
      return false;
    }
  }

  /**
   * Resolves the canonical action handler URL for password resets.
   */
  public getActionHandlerUrl(): string {
    try {
      const origin = window.location.origin;
      const base = window.location.pathname.startsWith('/hikmah-library') ? '/hikmah-library' : '';
      return `${origin}${base}/reset-password`;
    } catch {
      return 'https://hikmah-library.vercel.app/reset-password';
    }
  }

  /**
   * Requests a password reset email for an Administrator via Firebase Authentication.
   */
  public async sendAdminResetEmail(email: string): Promise<EmailResetDispatchResult> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) {
      return { success: false, message: norm.error || 'Invalid email address.' };
    }

    const remaining = this.getRemainingCooldown(norm.email);
    if (remaining > 0) {
      return {
        success: false,
        cooldownSeconds: remaining,
        message: `Please wait ${remaining} seconds before requesting another reset email.`,
      };
    }

    // Verify admin authorization
    const isAdmin = await this.isAuthorizedAdminEmail(norm.email);

    // Anti-enumeration protection: If email is not an authorized administrator,
    // return standard success message to the user UI without dispatching an email.
    if (!isAdmin) {
      this.setCooldown(norm.email);
      await DataService.addAuditLog(
        'ADMIN_RESET_IGNORED',
        'AUTH',
        `Password reset requested for unauthorized administrator address (${norm.email}). Ignored safely.`,
        'Security Engine'
      );
      return {
        success: true,
        cooldownSeconds: 60,
        message: GENERIC_RESET_SUCCESS_MESSAGE,
      };
    }

    // Verify Firebase Auth setup
    if (!isFirebaseConfigured()) {
      const configError =
        'Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID to your environment variables to enable email password reset.';
      await DataService.addAuditLog(
        'AUTH_CONFIG_MISSING',
        'AUTH',
        `Admin password reset requested for ${norm.email}, but Firebase Auth configuration is missing.`,
        'System'
      );
      return {
        success: false,
        error: configError,
        message: configError,
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      const authError = 'Authentication service is currently unavailable. Please try again later.';
      return { success: false, error: authError, message: authError };
    }

    const actionCodeSettings: ActionCodeSettings = {
      url: this.getActionHandlerUrl(),
    };

    try {
      const sendPromise = sendPasswordResetEmail(auth, norm.email, actionCodeSettings);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Password reset request timed out. Please check your internet connection and try again.')), 15000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      this.setCooldown(norm.email);

      DataService.addAuditLog(
        'ADMIN_PASSWORD_RESET_DISPATCHED',
        'AUTH',
        `Official Firebase password reset email dispatched to administrator (${norm.email}).`,
        'Chief Administrator Syed Absar'
      ).catch(() => {});

      return {
        success: true,
        cooldownSeconds: 60,
        message: GENERIC_RESET_SUCCESS_MESSAGE,
      };
    } catch (err: any) {
      console.error('Firebase sendPasswordResetEmail error:', err);
      const code = err?.code || '';
      let failureReason = 'Failed to dispatch password reset email. Please try again.';

      if (code === 'auth/unauthorized-domain') {
        failureReason =
          'Domain not authorized: Please add this deployment domain to Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (code === 'auth/too-many-requests') {
        failureReason = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (code === 'auth/user-not-found') {
        // Maintain account enumeration safety if user has not yet been registered in Firebase Auth
        this.setCooldown(norm.email);
        DataService.addAuditLog(
          'ADMIN_RESET_USER_NOT_FOUND',
          'AUTH',
          `Admin ${norm.email} exists in directory/rules but not yet provisioned in Firebase Auth.`,
          'Security Engine'
        ).catch(() => {});
        return {
          success: true,
          cooldownSeconds: 60,
          message: GENERIC_RESET_SUCCESS_MESSAGE,
        };
      } else if (err?.message) {
        failureReason = err.message;
      }

      DataService.addAuditLog(
        'AUTH_PROVIDER_ERROR',
        'AUTH',
        `sendPasswordResetEmail failed for admin ${norm.email}: ${err?.message || code}`,
        'System'
      ).catch(() => {});

      return {
        success: false,
        error: failureReason,
        message: failureReason,
      };
    }
  }

  /**
   * Requests a password reset email for a Member via Firebase Authentication.
   */
  public async sendMemberResetEmail(email: string): Promise<EmailResetDispatchResult> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) {
      return { success: false, message: norm.error || 'Invalid email address.' };
    }

    const remaining = this.getRemainingCooldown(norm.email);
    if (remaining > 0) {
      return {
        success: false,
        cooldownSeconds: remaining,
        message: `Please wait ${remaining} seconds before requesting another reset email.`,
      };
    }

    // Verify member exists in library directory
    const isMember = await this.isAuthorizedMemberEmail(norm.email);

    // Anti-enumeration protection: If email is not registered in the directory,
    // return standard success message without dispatching an email.
    if (!isMember) {
      this.setCooldown(norm.email);
      DataService.addAuditLog(
        'MEMBER_RESET_IGNORED',
        'AUTH',
        `Password reset requested for unregistered member address (${norm.email}). Ignored safely.`,
        'Security Engine'
      ).catch(() => {});
      return {
        success: true,
        cooldownSeconds: 60,
        message: GENERIC_RESET_SUCCESS_MESSAGE,
      };
    }

    // Verify Firebase Auth setup
    if (!isFirebaseConfigured()) {
      const configError =
        'Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID to environment variables to enable email password reset.';
      DataService.addAuditLog(
        'AUTH_CONFIG_MISSING',
        'AUTH',
        `Member password reset requested for ${norm.email}, but Firebase Auth configuration is missing.`,
        'System'
      ).catch(() => {});
      return {
        success: false,
        error: configError,
        message: configError,
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      const authError = 'Authentication service is currently unavailable. Please try again later.';
      return { success: false, error: authError, message: authError };
    }

    const actionCodeSettings: ActionCodeSettings = {
      url: this.getActionHandlerUrl(),
    };

    try {
      const sendPromise = sendPasswordResetEmail(auth, norm.email, actionCodeSettings);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Password reset request timed out. Please check your internet connection and try again.')), 15000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      this.setCooldown(norm.email);

      DataService.addAuditLog(
        'MEMBER_PASSWORD_RESET_DISPATCHED',
        'AUTH',
        `Official Firebase password reset email dispatched to student member (${norm.email}).`,
        'Self Service'
      ).catch(() => {});

      return {
        success: true,
        cooldownSeconds: 60,
        message: GENERIC_RESET_SUCCESS_MESSAGE,
      };
    } catch (err: any) {
      console.error('Firebase sendPasswordResetEmail error:', err);
      const code = err?.code || '';
      let failureReason = 'Failed to dispatch password reset email. Please try again.';

      if (code === 'auth/unauthorized-domain') {
        failureReason =
          'Domain not authorized: Please add this deployment domain to Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (code === 'auth/too-many-requests') {
        failureReason = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (code === 'auth/user-not-found') {
        // Anti-enumeration safe response for user not in Firebase Auth yet
        this.setCooldown(norm.email);
        await DataService.addAuditLog(
          'MEMBER_RESET_USER_NOT_FOUND',
          'AUTH',
          `Member ${norm.email} exists in directory but account has not been activated in Firebase Auth.`,
          'Security Engine'
        );
        return {
          success: true,
          cooldownSeconds: 60,
          message: GENERIC_RESET_SUCCESS_MESSAGE,
        };
      }

      await DataService.addAuditLog(
        'AUTH_PROVIDER_ERROR',
        'AUTH',
        `sendPasswordResetEmail failed for member ${norm.email}: ${err?.message || code}`,
        'System'
      );

      return {
        success: false,
        error: failureReason,
        message: failureReason,
      };
    }
  }

  /**
   * Verifies a Firebase action code (`oobCode`) from the reset email link.
   * Works across any browser or device independently with zero local storage requirements.
   */
  public async verifyResetCode(code: string): Promise<VerifyCodeResult> {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Please provide a valid password reset action code.' };
    }

    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured in this environment.',
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service is currently unavailable.' };
    }

    try {
      const email = await verifyPasswordResetCode(auth, trimmed);
      const isAdmin = await this.isAuthorizedAdminEmail(email);
      return {
        success: true,
        email,
        role: isAdmin ? 'admin' : 'member',
      };
    } catch (err: any) {
      const errCode = err?.code || '';
      if (errCode === 'auth/expired-action-code') {
        return {
          success: false,
          error: 'This password reset link has expired. Password reset links are valid for a limited time. Please request a new link.',
        };
      }
      if (errCode === 'auth/invalid-action-code') {
        return {
          success: false,
          error: 'This password reset link is invalid or has already been used. Please request a new link from the login page.',
        };
      }
      if (errCode === 'auth/user-disabled') {
        return {
          success: false,
          error: 'This account has been disabled. Please contact library administration.',
        };
      }
      if (errCode === 'auth/user-not-found') {
        return {
          success: false,
          error: 'The user account associated with this reset link was not found.',
        };
      }
      return {
        success: false,
        error: err?.message || 'Unable to verify password reset link. Please request a new one.',
      };
    }
  }

  /**
   * Confirms the password reset in Firebase Authentication and updates directory records.
   */
  public async confirmPasswordReset(
    oobCode: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ConfirmResetResult> {
    const trimmedCode = (oobCode || '').trim();
    if (!trimmedCode) {
      return { success: false, error: 'Missing password reset action code.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match. Please ensure both fields are identical.' };
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: policy.errors[0] || 'Password does not meet security requirements (min 8 characters).',
      };
    }

    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured in this environment.',
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service is currently unavailable.' };
    }

    // 1. Verify code to obtain target email and role
    const verifyRes = await this.verifyResetCode(trimmedCode);
    if (!verifyRes.success || !verifyRes.email) {
      return {
        success: false,
        error: verifyRes.error || 'The password reset link is invalid or has already been used.',
      };
    }

    const targetEmail = verifyRes.email.toLowerCase();
    const role = verifyRes.role || (await this.isAuthorizedAdminEmail(targetEmail) ? 'admin' : 'member');

    // 2. Commit the new password in Firebase Authentication (Single Source of Truth)
    try {
      await fbConfirmPasswordReset(auth, trimmedCode, newPassword);
    } catch (err: any) {
      const errCode = err?.code || '';
      if (errCode === 'auth/expired-action-code') {
        return {
          success: false,
          error: 'This password reset link has expired. Please request a fresh reset link.',
        };
      }
      if (errCode === 'auth/invalid-action-code') {
        return {
          success: false,
          error: 'This password reset link is invalid or has already been used.',
        };
      }
      if (errCode === 'auth/weak-password') {
        return {
          success: false,
          error: 'The password chosen is too weak according to authentication rules.',
        };
      }
      return {
        success: false,
        error: err?.message || 'Failed to update password in Firebase Authentication.',
      };
    }

    // 3. Keep local directory records and credentials cache synchronized
    if (role === 'admin' || targetEmail === OFFICIAL_ADMIN_EMAIL.toLowerCase()) {
      try {
        let creds: any = {};
        const item = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
        if (item) creds = JSON.parse(item);
        creds.password = newPassword;
        creds.email = targetEmail;
        creds.updatedAt = new Date().toISOString();
        creds.isProvisioned = true;
        localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(creds));
        window.dispatchEvent(new CustomEvent('hikmah_admin_creds_updated', { detail: creds }));
      } catch {
        // Fallback
      }

      await DataService.addAuditLog(
        'ADMIN_PASSWORD_RESET',
        'AUTH',
        `Administrator (${targetEmail}) successfully updated password via verified Firebase email link.`,
        'Chief Administrator Syed Absar'
      );
    } else {
      // Sync member directory record
      await DataService.updateMemberPasswordByEmail(targetEmail, newPassword);
      await DataService.addAuditLog(
        'MEMBER_PASSWORD_RESET',
        'AUTH',
        `Student member (${targetEmail}) successfully updated password via verified Firebase email link.`,
        'Self Service'
      );
    }

    return {
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.',
    };
  }
}

export const RealEmailAuth = new RealEmailAuthService();
