export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

/**
 * Strong password policy, enforced both client-side (UX) and server-side
 * (via Supabase Auth's own minimum length + this check re-run before
 * calling signUp, since the client is never trusted for security alone).
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  const errors: string[] = [];

  if (password.length < 8) errors.push("Pelo menos 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Uma letra maiúscula");
  if (!/[a-z]/.test(password)) errors.push("Uma letra minúscula");
  if (!/[0-9]/.test(password)) errors.push("Um número");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Um caractere especial");

  return { valid: errors.length === 0, errors };
}
