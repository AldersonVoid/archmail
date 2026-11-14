/**
 * Email list parsing and sanitization utilities
 */

export interface ParsedEmailList {
  valid: string[];
  invalid: string[];
  duplicatesCount: number;
  totalRaw: number;
}

// RFC 5322 simplified standard regex for practical validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Extract an email address from potential formats like "John Doe <john@example.com>" or plain "john@example.com"
 */
export function extractEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Parse a raw text blob (newlines, commas, semicolons, tabs) into a clean list of emails
 */
export function parseEmailList(rawText: string): ParsedEmailList {
  if (!rawText || !rawText.trim()) {
    return { valid: [], invalid: [], duplicatesCount: 0, totalRaw: 0 };
  }

  // Split by newline, comma, or semicolon
  const tokens = rawText
    .split(/[\r\n,;]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicatesCount = 0;

  for (const token of tokens) {
    const email = extractEmailAddress(token).toLowerCase();
    
    if (EMAIL_REGEX.test(email)) {
      if (seen.has(email)) {
        duplicatesCount++;
      } else {
        seen.add(email);
        valid.push(email);
      }
    } else {
      invalid.push(token);
    }
  }

  return {
    valid,
    invalid,
    duplicatesCount,
    totalRaw: tokens.length
  };
}

/**
 * Removes a dispatched email from the recipient text box string.
 * Preserves clean line breaks and other addresses.
 */
export function removeSentEmail(currentText: string, emailToRemove: string): string {
  if (!currentText) return '';
  const target = emailToRemove.trim().toLowerCase();
  if (!target) return currentText;

  // Split by newline while retaining lines
  const lines = currentText.split(/\r?\n/);
  const remainingLines: string[] = [];

  let removed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Check if line contains comma or semicolon multiple addresses
    if (line.includes(',') || line.includes(';')) {
      const parts = line.split(/([,;]\s*)/);
      // Cleanly filter out parts matching the email
      const newParts: string[] = [];
      for (const p of parts) {
        const cleanP = extractEmailAddress(p.replace(/[,;]/g, '')).toLowerCase().trim();
        if (cleanP === target && !removed) {
          removed = true;
          // Skip this item
        } else if (cleanP) {
          newParts.push(p.trim().replace(/^[,;]\s*/, '').replace(/[,;]\s*$/, ''));
        }
      }
      const reconstructed = newParts.filter(Boolean).join(', ');
      if (reconstructed) {
        remainingLines.push(reconstructed);
      }
    } else {
      const extracted = extractEmailAddress(trimmed).toLowerCase();
      if (extracted === target && !removed) {
        removed = true;
        // Skip this line
      } else {
        remainingLines.push(line);
      }
    }
  }

  return remainingLines.join('\n');
}

/**
 * Calculate bounce rate percentage
 */
export function calculateBounceRate(totalSent: number, totalBounced: number): number {
  if (!totalSent || totalSent <= 0) return 0;
  const rate = (totalBounced / totalSent) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}
