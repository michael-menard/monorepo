import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTime: string;
  crackTimeDisplay: string;
  matchSequence: any[];
}

export interface PasswordStrengthConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minScore: number; // 0-4
}

export const defaultPasswordConfig: PasswordStrengthConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minScore: 2, // At least "weak" password
};

export class PasswordStrengthChecker {
  private config: PasswordStrengthConfig;

  constructor(config: Partial<PasswordStrengthConfig> = {}) {
    this.config = { ...defaultPasswordConfig, ...config };
  }

  /**
   * Check password strength using zxcvbn
   */
  checkStrength(password: string): PasswordStrengthResult {
    const result = zxcvbn(password);
    
    return {
      score: result.score,
      feedback: {
        warning: result.feedback.warning || '',
        suggestions: result.feedback.suggestions || [],
      },
      crackTime: result.crack_times_display.online_no_throttle_10_per_second,
      crackTimeDisplay: result.crack_times_display.online_no_throttle_10_per_second,
      matchSequence: result.match_sequence,
    };
  }

  /**
   * Validate password against custom rules
   */
  validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum length
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    // Check for uppercase letters
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letters
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (this.config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check zxcvbn score
    const strengthResult = this.checkStrength(password);
    if (strengthResult.score < this.config.minScore) {
      warnings.push('Password is too weak. Consider using a stronger password.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get password strength label
   */
  getStrengthLabel(score: number): string {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get password strength color
   */
  getStrengthColor(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'red';
      case 2:
        return 'yellow';
      case 3:
        return 'blue';
      case 4:
        return 'green';
      default:
        return 'gray';
    }
  }
}

// Export default instance
export const passwordChecker = new PasswordStrengthChecker();

// Export utility functions
export const checkPasswordStrength = (password: string) => passwordChecker.checkStrength(password);
export const validatePassword = (password: string) => passwordChecker.validatePassword(password);
export const getStrengthLabel = (score: number) => passwordChecker.getStrengthLabel(score);
export const getStrengthColor = (score: number) => passwordChecker.getStrengthColor(score); 