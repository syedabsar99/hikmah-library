// Password & Passcode Policy Engine for Hikmah Library
// Policy: Minimum 8 characters, at least 1 uppercase letter, at least 1 number, at least 1 special character

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const validatePasswordPolicy = (password: string): PasswordValidationResult => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('At least 8 characters required');
  if (!hasUppercase) errors.push('At least 1 uppercase letter (A-Z) required');
  if (!hasNumber) errors.push('At least 1 number (0-9) required');
  if (!hasSpecial) errors.push('At least 1 special character (!@#$%^&* etc.) required');

  return {
    valid: errors.length === 0,
    errors,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
  };
};
