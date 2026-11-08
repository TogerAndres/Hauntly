const crypto = require('crypto');

/**
 * ==============================================================================
 * MC-Desk Enterprise Security Middleware & Utilities
 * Provides:
 *  1. Strict Password Complexity Policy Validator
 *  2. Timing Attack Mitigation Helper (Dummy bcrypt hash & constant-time comparison)
 *  3. Minecraft Console & RCON Command Injection Sanitizer
 *  4. Minecraft Gamertag Whitelist Sanitizer
 * ==============================================================================
 */

// Pre-computed bcrypt hash (10 rounds) for timing-attack mitigation on non-existent users
const DUMMY_BCRYPT_HASH = '$2a$10$wT7WfF4F9gW0L5D.P.e6ue3Z2lP07bUcmR3xLp0gL0lqNqVvF5h4G';

// Forbidden shell control characters to prevent OS shell breakouts (screen/bash/sh)
const FORBIDDEN_SHELL_PATTERNS = /[;&|`$><\\\n\r\0]/;

/**
 * Validates password complexity against enterprise security standards
 * Rules:
 *  - Length: 8 to 72 characters (72 is standard bcrypt max input length)
 *  - At least 1 lowercase letter (a-z)
 *  - At least 1 uppercase letter (A-Z)
 *  - At least 1 numeric digit (0-9)
 *  - At least 1 special character (!@#$%^&*()_+-=[]{};':"|,.<>/?~`)
 *
 * @param {string} password 
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePasswordPolicy(password) {
  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña debe ser una cadena de texto válida'] };
  }

  if (password.length < 8) {
    errors.push('La contraseña debe tener un mínimo de 8 caracteres');
  }

  if (password.length > 72) {
    errors.push('La contraseña no puede exceder los 72 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula (a-z)');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula (A-Z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número (0-9)');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial (@, #, $, %, &, *, !, etc.)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes and validates Minecraft Gamertags / Usernames
 * Standard Java & Bedrock Edition constraint: 2-16 alphanumeric or underscore chars
 *
 * @param {string} username 
 * @returns {string|null}
 */
function sanitizeMinecraftGamertag(username) {
  if (!username || typeof username !== 'string') return null;
  const clean = username.trim();
  if (/^[a-zA-Z0-9_]{2,16}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Sanitizes Minecraft server console / RCON commands
 * Prevents OS command injection, subshell executions, and chained shell scripts
 *
 * @param {string} command 
 * @returns {{ isValid: boolean, sanitized: string, error?: string }}
 */
function sanitizeConsoleCommand(command) {
  if (!command || typeof command !== 'string') {
    return { isValid: false, sanitized: '', error: 'El comando no puede estar vacío' };
  }

  const trimmed = command.trim();
  const stripped = trimmed.replace(/^[/]+/, ''); // Strip leading slashes

  if (stripped.length === 0) {
    return { isValid: false, sanitized: '', error: 'El comando no puede estar vacío' };
  }

  if (stripped.length > 250) {
    return { isValid: false, sanitized: '', error: 'Comando demasiado largo (máximo 250 caracteres)' };
  }

  // Check for forbidden shell metacharacters
  if (FORBIDDEN_SHELL_PATTERNS.test(stripped)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Comando bloqueado por seguridad: contiene caracteres de shell no permitidos (; & | ` $ > < \\)'
    };
  }

  // Check for command substitution syntax: $(...), `...`, ${...}
  if (/\$\(.*\)|`.*`|\$\{.*\}/.test(stripped)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Comando bloqueado: intento de sustitución o subshell detectado'
    };
  }

  return {
    isValid: true,
    sanitized: stripped
  };
}

/**
 * Timing-safe string comparison to prevent side-channel timing attacks
 *
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant time dummy check to avoid length leak
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  DUMMY_BCRYPT_HASH,
  validatePasswordPolicy,
  sanitizeMinecraftGamertag,
  sanitizeConsoleCommand,
  timingSafeEqual
};
