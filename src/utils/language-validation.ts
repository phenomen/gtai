/**
 * Validates a language code, accepting both short (e.g., "en") and full (e.g., "en-US") formats.
 * 
 * @param code - The language code to validate
 * @returns true if the code is valid, false otherwise
 */
export function isValidLangCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  const trimmed = code.trim();
  
  // Accept both short (en) and full (en-US) language codes
  // Pattern: 2 lowercase letters, optionally followed by hyphen and 2 uppercase letters
  const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  
  return languageCodePattern.test(trimmed);
}
