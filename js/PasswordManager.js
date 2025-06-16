/**
 * Password Manager - Client Side
 * Handles password encryption/decryption on the client side
 * Uses the same methods as index.html simulator
 */

class PasswordManager {
    /**
     * Simple encryption using the same method as index.html
     * @param {string} text - Plain text password
     * @param {number} shift - Encryption shift (default: 3)
     * @returns {string} Encrypted password
     */
    static encrypt(text, shift = 3) {
        if (!text) return '';
        return btoa(text.split('').map(char => 
            String.fromCharCode(char.charCodeAt(0) + shift)
        ).join(''));
    }

    /**
     * Simple decryption using the same method as index.html
     * @param {string} encryptedText - Encrypted password
     * @param {number} shift - Decryption shift (default: 3)
     * @returns {string|null} Decrypted password or null if failed
     */
    static decrypt(encryptedText, shift = 3) {
        if (!encryptedText) return '';
        try {
            return atob(encryptedText).split('').map(char => 
                String.fromCharCode(char.charCodeAt(0) - shift)
            ).join('');
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }

    /**
     * Check if a password appears to be encrypted
     * @param {string} password - Password to check
     * @returns {boolean} True if appears encrypted
     */
    static isEncrypted(password) {
        if (!password) return false;
        return password.length > 20 && /^[A-Za-z0-9+/]+=*$/.test(password);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {object} Validation result
     */
    static validateStrength(password) {
        const result = {
            isValid: false,
            score: 0,
            message: '',
            requirements: {
                minLength: password.length >= 8,
                hasLetters: /[a-zA-Z]/.test(password),
                hasNumbers: /\d/.test(password),
                hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            }
        };

        // Calculate score
        Object.values(result.requirements).forEach(req => {
            if (req) result.score++;
        });

        // Determine validity and message
        if (result.score >= 3) {
            result.isValid = true;
            result.message = result.score === 4 ? 'Strong password' : 'Good password';
        } else {
            result.message = 'Password must be at least 8 characters with letters and numbers';
        }

        return result;
    }

    /**
     * Prepare password for submission (encrypt if needed)
     * @param {string} password - Plain text password
     * @returns {string} Encrypted password ready for server
     */
    static prepareForSubmission(password) {
        if (!password) return '';
        if (this.isEncrypted(password)) return password;
        return this.encrypt(password);
    }

    /**
     * Handle password input in forms
     * @param {HTMLInputElement} passwordField - Password input field
     * @param {HTMLElement} strengthIndicator - Optional strength indicator
     */
    static setupPasswordField(passwordField, strengthIndicator = null) {
        if (!passwordField) return;

        passwordField.addEventListener('input', () => {
            const password = passwordField.value;
            if (strengthIndicator && password) {
                const validation = this.validateStrength(password);
                this.updateStrengthIndicator(strengthIndicator, validation);
            }
        });
    }

    /**
     * Update password strength indicator
     * @param {HTMLElement} indicator - Strength indicator element
     * @param {object} validation - Validation result
     */
    static updateStrengthIndicator(indicator, validation) {
        if (!indicator) return;

        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60'];
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        
        const color = colors[validation.score - 1] || colors[0];
        const label = labels[validation.score - 1] || labels[0];
        const width = Math.max(25, (validation.score / 4) * 100);

        // Update progress bar if exists
        const progressBar = indicator.querySelector('.progress-bar, .strength-fill');
        if (progressBar) {
            progressBar.style.width = `${width}%`;
            progressBar.style.backgroundColor = color;
        }

        // Update label if exists
        const labelElement = indicator.querySelector('.strength-level, .strength-label');
        if (labelElement) {
            labelElement.textContent = label;
            labelElement.style.color = color;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordManager;
} else {
    window.PasswordManager = PasswordManager;
}