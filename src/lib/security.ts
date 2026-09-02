/**
 * Security utility functions for the WorkControl application.
 *
 * Provides input sanitization, validation, CSP helpers,
 * and other security primitives used across the app.
 */

// ─── Constants ──────────────────────────────────────────────────

/** Maximum lengths for user-supplied strings */
export const MAX_LENGTH = {
  name: 100,
  title: 200,
  description: 2000,
  notes: 5000,
  text: 500,
  code: 50,
  email: 254,
} as const;

/** Allowed file types for uploads */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** Max upload size: 5 MB */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ─── Sanitization ───────────────────────────────────────────────

/**
 * Sanitize a string by removing HTML tags and trimming whitespace.
 * Prevents stored XSS attacks via user-supplied text.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "link"];
  let cleaned = "";
  let i = 0;
  const len = trimmed.length;

  while (i < len) {
    if (trimmed[i] === "<") {
      const tagEnd = trimmed.indexOf(">", i);
      if (tagEnd === -1) {
        // Unclosed tag at the end of string, strip it
        break;
      }
      const tagText = trimmed.slice(i + 1, tagEnd).trim().toLowerCase();
      const tagName = tagText.split(/[\s/>]/)[0];

      if (DANGEROUS_TAGS.includes(tagName)) {
        const closeTag = `</${tagName}>`;
        const closeIdx = trimmed.toLowerCase().indexOf(closeTag, tagEnd + 1);
        if (closeIdx !== -1) {
          i = closeIdx + closeTag.length;
          continue;
        } else {
          // Unclosed dangerous block, strip remainder
          break;
        }
      }

      // Regular HTML tag, skip past it
      i = tagEnd + 1;
      continue;
    }

    cleaned += trimmed[i];
    i++;
  }

  return cleaned
    .replace(/&(?:amp|lt|gt|quot|#x27|#39);/gi, (match) => {
      const entities: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#x27;": "'",
        "&#39;": "'",
      };
      return entities[match] ?? match;
    })
    .trim();
}

/**
 * Truncate a string to the given max length.
 */
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength);
}

/**
 * Sanitize and truncate user text input.
 */
export function sanitizeAndTruncate(input: unknown, maxLength: number = MAX_LENGTH.text): string {
  return truncate(sanitizeText(input), maxLength);
}

// ─── Validation ─────────────────────────────────────────────────

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_LENGTH.email;
}

/**
 * Validate a UUID v4 string.
 */
export function isValidUUID(uuid: string): boolean {
  // Matches UUID v4: third segment MUST start with '4'
  // and fourth segment MUST start with 8, 9, a, or b
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}

/**
 * Check if a URL is safe (http/https only, no javascript: or data: URLs).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate file upload security: type and size checks.
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Use: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

/**
 * Check if a string contains potentially malicious content.
 * Used for input validation on fields that allow rich input.
 */
export function containsSuspiciousContent(input: string): boolean {
  const suspiciousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onerror=, onclick=
    /data:text\/html/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

// ─── Rate Limiting (client-side) ────────────────────────────────

/** Simple in-memory rate limiter for client-side protection */
const rateLimitStore = new Map<string, number[]>();

/**
 * Check if an action is rate-limited.
 * @param key - Unique key for the action (e.g., "login-attempt")
 * @param maxRequests - Max allowed requests in the window
 * @param windowMs - Time window in milliseconds
 */
export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) ?? [];

  // Remove timestamps outside the window
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return true;
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return false;
}

/** Clear rate limit for a specific key (e.g., after successful login) */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ─── CSP Helpers ────────────────────────────────────────────────

/**
 * Generate a cryptographic nonce for CSP.
 * Used in server-side rendering to allow inline scripts.
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ─── Password Strength ──────────────────────────────────────────

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Muito fraca" | "Fraca" | "Razoável" | "Boa" | "Excelente";
  color: string;
}

/**
 * Evaluate password strength.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

  const levels: PasswordStrength[] = [
    { score: 0, label: "Muito fraca", color: "#ef4444" },
    { score: 1, label: "Fraca", color: "#f97316" },
    { score: 2, label: "Razoável", color: "#eab308" },
    { score: 3, label: "Boa", color: "#22c55e" },
    { score: 4, label: "Excelente", color: "#10b981" },
  ];

  return levels[clamped];
}
