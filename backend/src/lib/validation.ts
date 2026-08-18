export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number';

export const isValidPassword = (password: string): boolean => {
  return PASSWORD_REGEX.test(password);
};
