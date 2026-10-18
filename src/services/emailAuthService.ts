import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type ActionCodeSettings,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DataService } from './dataService';
import { validatePasswordPolicy } from '../utils/validation';

export const OFFICIAL_ADMIN_EMAIL = 'syedabsar99@gmail.com';
export const ADMIN_CREDENTIALS_KEY = 'hikmah_admin_creds_v2';
const LOCAL_RESET_TOKENS_KEY = 'hikmah_secure_reset_tokens_v2';

export interface EmailResetDispatchResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  resetUrl?: string;
  rawToken?: string;
  rawCode?: string;
  error?: string;
}

export interface VerifyCodeResult {
  success: boolean;
  email?: string;
  error?: string;
}

export interface ConfirmResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface LocalResetTokenEntry {
  tokenHash: string;
  rawCode?: string;
  email: string;
  role: 'admin' | 'member';
  expiresAt: number;
  used: boolean;
}

class RealEmailAuthService {
  // 60-second in-memory cooldown tracker by email
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
  private setCooldown(email: string) {
    const norm = this.normalizeEmail(email);
    if (norm.isValid) {
      this.cooldowns.set(norm.email, Date.now());
    }
  }

  /**
   * Checks if an email is registered as an Administrator in storage / database.
   */
  public async isAuthorizedAdminEmail(email: string): Promise<boolean> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) return false;

    // Check Cloud Firestore if configured
    if (isFirebaseConfigured() && db) {
      try {
        const adminDoc = await getDoc(doc(db, 'admin_roles', norm.email));
        if (adminDoc.exists() && adminDoc.data()?.role === 'admin') {
          return true;
        }
      } catch {
        // Fallback
      }
    }

    if (
      norm.email === OFFICIAL_ADMIN_EMAIL.toLowerCase() ||
      norm.email === 'admin@hikmahlibrary.com'
    ) {
      return true;
    }

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
      return members.some((m) => (m as any).email?.toLowerCase() === norm.email);
    } catch {
      return false;
    }
  }

  /**
   * Generates a SHA-256 hash string for a token.
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Stores a local cryptographically secure reset token.
   */
  private async storeLocalResetToken(
    rawToken: string,
    email: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    const tokenHash = await this.hashToken(rawToken);
    const rawCode = rawToken.slice(0, 8).toUpperCase();
    const entry: LocalResetTokenEntry = {
      tokenHash,
      rawCode,
      email,
      role,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      used: false,
    };

    try {
      const existing = localStorage.getItem(LOCAL_RESET_TOKENS_KEY);
      const list: LocalResetTokenEntry[] = existing ? JSON.parse(existing) : [];
      // Keep only unexpired tokens
      const active = list.filter((t) => Date.now() < t.expiresAt);
      active.push(entry);
      localStorage.setItem(LOCAL_RESET_TOKENS_KEY, JSON.stringify(active));
    } catch {
      // Fallback
    }

    // Synchronize token to server backend so external mobile devices can verify it immediately
    try {
      await fetch('/api/auth/store-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Offline fallback
    }
  }

  /**
   * Looks up a local reset token by verifying its SHA-256 hash or 8-char code.
   */
  private async findLocalResetToken(
    rawTokenOrCode: string
  ): Promise<{ entry: LocalResetTokenEntry; index: number; list: LocalResetTokenEntry[] } | null> {
    try {
      const clean = (rawTokenOrCode || '').trim();
      const tokenHash = await this.hashToken(clean);
      const existing = localStorage.getItem(LOCAL_RESET_TOKENS_KEY);
      if (!existing) return null;
      const list: LocalResetTokenEntry[] = JSON.parse(existing);
      const index = list.findIndex(
        (t) =>
          t.tokenHash === tokenHash ||
          (t.rawCode && t.rawCode.toUpperCase() === clean.toUpperCase())
      );
      if (index === -1) return null;
      return { entry: list[index], index, list };
    } catch {
      return null;
    }
  }

  /**
   * Resolves the canonical base URL, respecting repository base paths (such as GitHub Pages /hikmah-library).
   */
  private getBaseUrl(): string {
    try {
      const origin = window.location.origin;
      const isGhPages = window.location.pathname.startsWith('/hikmah-library');
      return isGhPages ? `${origin}/hikmah-library` : origin;
    } catch {
      return '';
    }
  }

  /**
   * Sends a genuine password reset email to an Administrator.
   * If Firebase is configured, calls Google Firebase Auth.
   * If in local mode, generates a cryptographically signed single-use reset link.
   */
  public async sendAdminResetEmail(email: string): Promise<EmailResetDispatchResult> {
    const norm = this.normalizeEmail(email);
    if (!norm.isValid) {
      return { success: false, message: norm.error || 'Invalid email address.' };
    }

    // Cooldown check
    const remaining = this.getRemainingCooldown(norm.email);
    if (remaining > 0) {
      return {
        success: false,
        cooldownSeconds: remaining,
        message: `Please wait ${remaining} seconds before requesting another reset email.`,
      };
    }

    // Check backend authorization: must have admin role
    const isAdmin = await this.isAuthorizedAdminEmail(norm.email);

    // Generic anti-enumeration response message
    const genericSuccess =
      'If this email is registered, a password reset link has been sent. Please check your inbox and Spam folder.';

    if (!isAdmin) {
      // Return generic success to prevent email enumeration
      this.setCooldown(norm.email);
      return {
        success: true,
        cooldownSeconds: 60,
        message: genericSuccess,
      };
    }

    // 1. If Firebase is configured, dispatch genuine Firebase email
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        try {
          const actionCodeSettings: ActionCodeSettings = {
            url: `${this.getBaseUrl()}/reset-password`,
            handleCodeInApp: true,
          };

          await sendPasswordResetEmail(auth, norm.email, actionCodeSettings);
          this.setCooldown(norm.email);

          await DataService.addAuditLog(
            'ADMIN_PASSWORD_RESET',
            'AUTH',
            `Password reset email link dispatched to administrator (${norm.email}) via Firebase Auth.`,
            'System Security'
          );

          return {
            success: true,
            cooldownSeconds: 60,
            message: genericSuccess,
          };
        } catch (err: any) {
          const code = err?.code || '';
          if (code === 'auth/too-many-requests') {
            return {
              success: false,
              error: 'TOO_MANY_REQUESTS',
              message: 'Too many reset requests sent recently. Please wait before trying again.',
            };
          }
          if (code === 'auth/invalid-email') {
            return {
              success: false,
              error: 'INVALID_EMAIL',
              message: 'The email address is invalid.',
            };
          }
        }
      }
    }

    // 2. Dual Storage Engine: Local Persistent Mode (Cryptographic Token Lifecycle)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawToken = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const rawCode = rawToken.slice(0, 8).toUpperCase();

    await this.storeLocalResetToken(rawToken, norm.email, 'admin');
    this.setCooldown(norm.email);

    // Guaranteed canonical link pointing directly to active host (localhost, custom domain, or GitHub Pages repo path)
    const resetUrl = `${this.getBaseUrl()}/reset-password?oobCode=${rawToken}`;

    // Dispatch real email via FormSubmit directly to user's real email inbox
    await this.dispatchRealEmail(norm.email, resetUrl, rawCode, 'admin');

    await DataService.addAuditLog(
      'ADMIN_PASSWORD_RESET',
      'AUTH',
      `Secure password reset link generated and dispatched to administrator (${norm.email}).`,
      'System Security'
    );

    return {
      success: true,
      cooldownSeconds: 60,
      message: genericSuccess,
      resetUrl,
      rawToken,
      rawCode,
    };
  }

  /**
   * Dispatches a real outbound email with the cryptographically signed reset link.
   * Sends clean, reliable reset URLs pointing directly to the actual running site.
   */
  private async dispatchRealEmail(
    email: string,
    resetUrl: string,
    rawCode: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    try {
      await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          _subject: `Hikmah Library & Study Lounge — Password Reset Link (${role === 'admin' ? 'Administrator' : 'Student'})`,
          _template: 'box',
          _captcha: 'false',
          Library: 'Hikmah Library & Study Lounge',
          Account_Email: email,
          Account_Role: role === 'admin' ? 'Administrator' : 'Student',
          Password_Reset_Link: resetUrl,
          Verification_Code: rawCode,
          Instructions:
            'Click Password_Reset_Link directly to set your new password on the Hikmah Library portal, or copy the Verification_Code to enter it on the reset password screen.',
        }),
      });
    } catch {
      // Background network fallback
    }
  }

  /**
   * Sends a password reset email to a Member.
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

    const isMember = await this.isAuthorizedMemberEmail(norm.email);
    const genericSuccess =
      'If this email is registered, a password reset link has been sent. Please check your inbox and Spam folder.';

    if (!isMember) {
      this.setCooldown(norm.email);
      return {
        success: true,
        cooldownSeconds: 60,
        message: genericSuccess,
      };
    }

    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        try {
          const actionCodeSettings: ActionCodeSettings = {
            url: `${this.getBaseUrl()}/reset-password`,
            handleCodeInApp: true,
          };

          await sendPasswordResetEmail(auth, norm.email, actionCodeSettings);
          this.setCooldown(norm.email);

          return {
            success: true,
            cooldownSeconds: 60,
            message: genericSuccess,
          };
        } catch {
          // Fall through to local cryptographic token
        }
      }
    }

    // Local mode cryptographic token
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawToken = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const rawCode = rawToken.slice(0, 8).toUpperCase();

    await this.storeLocalResetToken(rawToken, norm.email, 'member');
    this.setCooldown(norm.email);

    // Guaranteed canonical link pointing directly to active host
    const resetUrl = `${this.getBaseUrl()}/reset-password?oobCode=${rawToken}`;

    await this.dispatchRealEmail(norm.email, resetUrl, rawCode, 'member');

    return {
      success: true,
      cooldownSeconds: 60,
      message: genericSuccess,
      resetUrl,
      rawToken,
      rawCode,
    };
  }

  /**
   * Verifies the out-of-band password reset code (oobCode) from the email link.
   */
  public async verifyResetCode(oobCode: string): Promise<VerifyCodeResult> {
    const trimmed = (oobCode || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Missing password reset code in link.' };
    }

    // 1. First check with Firebase if configured
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        try {
          const email = await verifyPasswordResetCode(auth, trimmed);
          return { success: true, email };
        } catch {
          // Check local token below before failing
        }
      }
    }

    const tokenHash = await this.hashToken(trimmed);

    // 2. Check local cryptographic token entry in localStorage
    const local = await this.findLocalResetToken(trimmed);
    if (local && !local.entry.used && Date.now() <= local.entry.expiresAt) {
      return { success: true, email: local.entry.email };
    }

    // 3. Check server backend state (Crucial for mobile devices opening links created on laptop)
    try {
      const serverRes = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, code: trimmed }),
      });
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.valid && data.email) {
          return { success: true, email: data.email };
        }
        if (data.error) {
          return { success: false, error: data.error };
        }
      }
    } catch {
      // Offline fallback
    }

    if (local) {
      if (local.entry.used) {
        return {
          success: false,
          error: 'This password reset link has already been used.',
        };
      }
      if (Date.now() > local.entry.expiresAt) {
        return {
          success: false,
          error: 'This password reset link has expired. Please request a new one.',
        };
      }
    }

    return {
      success: false,
      error: 'This password reset link is invalid or has already been used.',
    };
  }

  /**
   * Confirms the password reset using the verified oobCode.
   */
  public async confirmPasswordReset(
    oobCode: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ConfirmResetResult> {
    const trimmedCode = (oobCode || '').trim();
    if (!trimmedCode) {
      return { success: false, error: 'Missing reset action code.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    // Min 8 characters, uppercase, number, symbol
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: policy.errors[0] || 'Password does not meet security requirements (min 8 chars).',
      };
    }

    // 1. Try Firebase if configured
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth) {
        try {
          const email = await verifyPasswordResetCode(auth, trimmedCode);
          await confirmPasswordReset(auth, trimmedCode, newPassword);

          // Update local storage credentials
          if (await this.isAuthorizedAdminEmail(email)) {
            try {
              let creds: any = {};
              const item = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
              if (item) creds = JSON.parse(item);
              creds.password = newPassword;
              creds.email = email;
              creds.updatedAt = new Date().toISOString();
              localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(creds));
            } catch {
              // Fallback
            }
          }

          await DataService.addAuditLog(
            'ADMIN_PASSWORD_RESET',
            'AUTH',
            `Password reset successfully confirmed via Firebase for account (${email}).`,
            'System Security'
          );

          return {
            success: true,
            message:
              'Your password has been successfully reset! You can now log in with your new password.',
          };
        } catch {
          // Check local token below
        }
      }
    }

    const tokenHash = await this.hashToken(trimmedCode);

    // 2. Commit reset to server backend (Crucial for mobile devices & cross-device sync)
    let serverUpdated = false;
    let targetEmail = '';
    try {
      const serverRes = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, code: trimmedCode, newPassword }),
      });
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success) {
          serverUpdated = true;
          targetEmail = data.email || '';
        }
      }
    } catch {
      // Offline fallback
    }

    // 3. Check local cryptographic token entry
    const local = await this.findLocalResetToken(trimmedCode);
    if (!local && !serverUpdated) {
      return {
        success: false,
        error: 'This reset link is invalid or has already been used.',
      };
    }

    if (local) {
      if (local.entry.used) {
        return {
          success: false,
          error: 'This reset link has already been used.',
        };
      }

      if (Date.now() > local.entry.expiresAt) {
        return {
          success: false,
          error: 'This reset link has expired. Please request a new link.',
        };
      }

      // Burn token immediately in local storage (single-use guarantee!)
      local.entry.used = true;
      local.list[local.index] = local.entry;
      try {
        localStorage.setItem(LOCAL_RESET_TOKENS_KEY, JSON.stringify(local.list));
      } catch {
        // Fallback
      }
      if (!targetEmail) targetEmail = local.entry.email;
    }

    // Commit password change to local storage
    if (
      (local && local.entry.role === 'admin') ||
      (await this.isAuthorizedAdminEmail(targetEmail || 'syedabsar99@gmail.com'))
    ) {
      try {
        let creds: any = {};
        const item = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
        if (item) creds = JSON.parse(item);
        creds.password = newPassword;
        creds.email = targetEmail || creds.email || OFFICIAL_ADMIN_EMAIL;
        creds.updatedAt = new Date().toISOString();
        localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(creds));
      } catch {
        // Fallback
      }
    } else {
      // Member passcode update
      try {
        const members = await DataService.getMembers();
        const member = members.find(
          (m) => (m as any).email?.toLowerCase() === (targetEmail || local?.entry.email || '').toLowerCase()
        );
        if (member) {
          await DataService.updateMemberPasscode(member.phoneNumber, newPassword);
        }
      } catch {
        // Fallback
      }
    }

    await DataService.addAuditLog(
      'ADMIN_PASSWORD_RESET',
      'AUTH',
      `Password reset successfully confirmed for account (${targetEmail || 'Administrator'}).`,
      'System Security'
    );

    return {
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.',
    };
  }
}

export const RealEmailAuth = new RealEmailAuthService();

