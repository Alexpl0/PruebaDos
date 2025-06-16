/**
 * Password Reset JavaScript
 * Handles reset requests and password changes with encryption
 */

document.addEventListener('DOMContentLoaded', function () {
    // Load PasswordManager if not already loaded
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = function() {
            console.log('PasswordManager loaded for password reset');
            initializePasswordReset();
        };
        document.head.appendChild(script);
    } else {
        initializePasswordReset();
    }
});

/**
 * Initialize logic depending on the present form
 */
function initializePasswordReset() {
    if (document.getElementById('recovery-form')) {
        initializeRecoveryForm();
    }
    if (document.getElementById('reset-form')) {
        initializeResetForm();
    }
}

/**
 * Initialize the recovery form
 */
function initializeRecoveryForm() {
    const form = document.getElementById('recovery-form');
    if (!form) return;
    form.addEventListener('submit', handleRecoverySubmit);
}

/**
 * Handles the recovery form submission
 */
async function handleRecoverySubmit(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();

    if (!email) {
        Swal.fire('Error', 'Please enter your email address.', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        Swal.fire('Error', 'The email address is not valid.', 'error');
        return;
    }

    Swal.fire({
        title: 'Sending request...',
        text: 'Please wait while we process your request.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch(URLPF + 'dao/users/daoPasswordReset.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Done',
                html: `
                    <div style="text-align: left;">
                        <p><strong>${result.message}</strong></p>
                        <p><i class="fas fa-shield-alt"></i> Your new password will be encrypted automatically</p>
                        <p><i class="fas fa-clock"></i> Reset link expires in 24 hours</p>
                    </div>
                `
            });
        } else {
            Swal.fire('Error', result.message || 'Could not send the recovery email.', 'error');
        }
    } catch (error) {
        Swal.close();
        Swal.fire('Error', 'An error occurred while sending the request.', 'error');
        console.error(error);
    }
}

/**
 * Initialize the password reset form
 */
function initializeResetForm() {
    const form = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (!form || !newPasswordInput || !confirmPasswordInput) return;

    form.addEventListener('submit', handleResetSubmit);
    
    // Initialize with blank strength
    resetPasswordStrength();
    
    // NUEVO: Setup PasswordManager if available
    if (typeof PasswordManager !== 'undefined') {
        const strengthIndicator = document.getElementById('password-strength-indicator');
        if (strengthIndicator) {
            // Create strength indicator HTML if it doesn't exist
            if (!strengthIndicator.querySelector('.strength-fill')) {
                strengthIndicator.innerHTML = `
                    <div class="strength-bar" style="height: 4px; background-color: #e0e0e0; border-radius: 2px; margin-top: 5px;">
                        <div class="strength-fill" style="height: 100%; border-radius: 2px; transition: all 0.3s ease; width: 0%; background-color: #ccc;"></div>
                    </div>
                    <small class="strength-level" style="font-size: 12px; margin-top: 2px; display: block;"></small>
                `;
            }
            PasswordManager.setupPasswordField(newPasswordInput, strengthIndicator);
        }
    }
    
    // Add event listeners
    newPasswordInput.addEventListener('input', updatePasswordStrength);
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // Password visibility toggle
    const toggleIcons = document.querySelectorAll('.toggle-password-icon');
    toggleIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.className = 'fas fa-eye toggle-password-icon';
                } else {
                    passwordInput.type = 'password';
                    this.className = 'fas fa-eye-slash toggle-password-icon';
                }
            }
        });
    });

    // Check URL parameters for errors
    checkUrlParameters();
}

/**
 * Handles the password reset form submission
 */
async function handleResetSubmit(event) {
    event.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const token = document.getElementById('reset-token').value;
    const userId = document.getElementById('user-id').value;

    if (!newPassword || !confirmPassword) {
        Swal.fire('Error', 'Please enter and confirm your new password.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        Swal.fire('Error', 'Passwords do not match.', 'error');
        return;
    }

    // NUEVO: Usar PasswordManager para validación si está disponible
    if (typeof PasswordManager !== 'undefined') {
        const passwordValidation = PasswordManager.validateStrength(newPassword);
        if (!passwordValidation.isValid) {
            Swal.fire('Error', passwordValidation.message, 'error');
            return;
        }
    } else {
        // Fallback validation
        if (!isStrongPassword(newPassword)) {
            Swal.fire('Error', 'Password must be at least 8 characters long and include both letters and numbers.', 'error');
            return;
        }
    }

    Swal.fire({
        title: 'Updating password...',
        html: `
            <div style="text-align: left;">
                <p><i class="fas fa-key"></i> Validating reset token...</p>
                <p><i class="fas fa-shield-alt"></i> Encrypting new password...</p>
                <p><i class="fas fa-database"></i> Updating your account...</p>
            </div>
        `,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    // NUEVO: Encriptar contraseña antes de enviar si PasswordManager está disponible
    let passwordToSend = newPassword;
    if (typeof PasswordManager !== 'undefined') {
        passwordToSend = PasswordManager.prepareForSubmission(newPassword);
        console.log('Password encrypted for reset');
    } else {
        console.warn('PasswordManager not available, sending plain password');
    }

    try {
        const response = await fetch(URLPF + 'dao/users/daoPasswordUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                userId: userId,
                newPassword: passwordToSend // Usar contraseña encriptada
            })
        });
        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                html: `
                    <div style="text-align: left;">
                        <p><strong>${result.message}</strong></p>
                        <p><i class="fas fa-shield-alt text-success"></i> Your password has been encrypted and secured</p>
                        <p><i class="fas fa-sign-in-alt"></i> You can now log in with your new password</p>
                    </div>
                `,
                confirmButtonText: 'Go to Login'
            }).then(() => {
                window.location.href = 'index.php';
            });
        } else {
            Swal.fire('Error', result.message || 'Could not update the password.', 'error');
        }
    } catch (error) {
        Swal.close();
        Swal.fire('Error', 'An error occurred while updating the password.', 'error');
        console.error(error);
    }
}

/**
 * Reset password strength indicator to blank state
 */
function resetPasswordStrength() {
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');
    
    if (strengthFill && strengthLevel) {
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#ccc';
        strengthLevel.textContent = '';
    }
    
    const matchText = document.querySelector('.match-text');
    if (matchText) {
        matchText.textContent = '';
    }
}

/**
 * Updates the password strength indicator
 */
function updatePasswordStrength() {
    const password = document.getElementById('new-password').value;
    
    // Use PasswordManager if available, otherwise use fallback
    if (typeof PasswordManager !== 'undefined' && password) {
        const validation = PasswordManager.validateStrength(password);
        const strengthFill = document.querySelector('.strength-fill');
        const strengthLevel = document.querySelector('.strength-level');

        if (!strengthFill || !strengthLevel) return;
        
        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60'];
        const color = colors[validation.score - 1] || colors[0];
        const width = Math.max(25, (validation.score / 4) * 100);

        strengthFill.style.width = `${width}%`;
        strengthFill.style.backgroundColor = color;
        strengthLevel.textContent = validation.message;
        strengthLevel.style.color = color;
    } else {
        // Fallback method
        updatePasswordStrengthFallback();
    }

    checkPasswordMatch();
}

/**
 * Fallback password strength update
 */
function updatePasswordStrengthFallback() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');

    if (!strengthFill || !strengthLevel) return;
    
    // Handle empty password
    if (!password) {
        resetPasswordStrength();
        return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    let level = 'Weak';
    let color = '#e74c3c';
    let width = '20%';

    if (strength >= 4) {
        level = 'Strong';
        color = '#27ae60';
        width = '100%';
    } else if (strength >= 3) {
        level = 'Medium';
        color = '#f1c40f';
        width = '60%';
    } else if (strength >= 2) {
        level = 'Low';
        color = '#f39c12';
        width = '40%';
    }

    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;
    strengthLevel.textContent = level;
    strengthLevel.style.color = color;
}

/**
 * Checks if passwords match and updates the match text
 */
function checkPasswordMatch() {
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const matchText = document.querySelector('.match-text');

    if (!matchText) return;

    if (!confirmPassword) {
        matchText.textContent = '';
        return;
    }

    if (password === confirmPassword) {
        matchText.textContent = 'Passwords match';
        matchText.style.color = '#27ae60';
    } else {
        matchText.textContent = 'Passwords do not match';
        matchText.style.color = '#e74c3c';
    }
}

/**
 * Checks URL parameters to show error messages
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
        Swal.fire('Error', decodeURIComponent(error), 'error');
    }
}

/**
 * Validates email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates that the password is strong (fallback)
 */
function isStrongPassword(password) {
    return password.length >= 8 &&
        /[a-zA-Z]/.test(password) &&
        /\d/.test(password);
}

/**
 * Base URL for AJAX requests
 */
if (typeof window.URLPF === 'undefined') {
    window.URLPF = 'https://grammermx.com/Jesus/PruebaDos/';
}