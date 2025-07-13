declare module 'zxcvbn' {
  interface ZxcvbnResult {
    score: number;
    feedback: {
      warning: string;
      suggestions: string[];
    };
    crack_times_display: {
      online_no_throttle_10_per_second: string;
    };
    match_sequence: any[];
  }

  function zxcvbn(password: string): ZxcvbnResult;
  export = zxcvbn;
} 