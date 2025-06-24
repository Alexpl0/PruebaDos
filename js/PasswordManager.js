/**
 * Password Manager - Client Side
 * Handles password encryption/decryption for login
 */

class PasswordManager {
    /**
     * Simple encryption (same as PHP version)
     * @param {string} text - Plain text password
     * @param {number} shift - Encryption shift (default: 3)
     * @returns {string} - Encrypted password (base64)
     */
    static encrypt(text, shift = 3) {
        if (!text) return '';
        let shifted = '';
        for (let i = 0; i < text.length; i++) {
            shifted += String.fromCharCode(text.charCodeAt(i) + shift);
        }
        return btoa(shifted);
    }

    /**
     * Simple decryption (same as PHP version)
     * @param {string} encryptedText - Encrypted password (base64)
     * @param {number} shift - Decryption shift (default: 3)
     * @returns {string} - Decrypted password
     */
    static decrypt(encryptedText, shift = 3) {
        if (!encryptedText) return '';
        let decoded = atob(encryptedText);
        let original = '';
        for (let i = 0; i < decoded.length; i++) {
            original += String.fromCharCode(decoded.charCodeAt(i) - shift);
        }
        return original;
    }

    /**
     * Validates password strength
     * @param {string} password - The password to validate
     * @returns {Object} - Validation result with isValid and message
     */
    static validateStrength(password) {
        const minLength = 8;
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);

        if (password.length < minLength) {
            return { isValid: false, message: 'Password must be at least 8 characters long.' };
        }
        if (!hasNumber || !hasLetter) {
            return { isValid: false, message: 'Password must include both letters and numbers.' };
        }
        return { isValid: true, message: 'Password is strong.' };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordManager;
} else {
    window.PasswordManager = PasswordManager;
}