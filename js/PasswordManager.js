/**
 * Password Manager - Client Side
 * Handles password validation only (no encryption/decryption).
 */

class PasswordManager {
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