/**
 * Password Reset JavaScript
 * Handles reset requests and password changes with encryption
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('Password Reset JS loaded');
    
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
    console.log('Initializing password reset functionality');
    
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
    console.log('Initializing recovery form');
    const form = document.getElementById('recovery-form');
    if (!form) return;
    form.addEventListener('submit', handleRecoverySubmit);
}

/**
 * Initialize the password reset form
 */
function initializeResetForm() {
    console.log('Initializing reset form');
    const form = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (!form || !newPasswordInput || !confirmPasswordInput) {
        console.error('Reset form elements not found');
        return;
    }

    // Add form submit handler
    form.addEventListener('submit', handleResetSubmit);
    
    // Initialize password strength and match indicators
    initializePasswordIndicators();
    
    // Setup password visibility toggles
    setupPasswordToggles();
    
    // Add real-time validation
    newPasswordInput.addEventListener('input', function() {
        updatePasswordStrength();
        if (confirmPasswordInput.value) {
            checkPasswordMatch();
        }
    });
    
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    
    console.log('Reset form initialized successfully');
}

/**
 * Initialize password strength and match indicators
 */
function initializePasswordIndicators() {
    // Ensure password strength indicator exists with proper structure
    const strengthContainer = document.querySelector('.password-strength');
    if (strengthContainer && !strengthContainer.querySelector('.strength-fill')) {
        strengthContainer.innerHTML = `
            <div class="progress">
                <div class="progress-bar strength-fill" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <small class="strength-text text-muted">Password strength: <span class="strength-level">Weak</span></small>
        `;
    }
    
    // Initialize with blank state
    resetPasswordStrength();
}

/**
 * Setup password visibility toggles
 */
function setupPasswordToggles() {
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
 * Handles the password reset form submission
 */
async function handleResetSubmit(event) {
    event.preventDefault();
    console.log('Handling reset form submission');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const token = document.getElementById('reset-token').value;
    const userId = document.getElementById('user-id').value;

    // Validation
    if (!newPassword || !confirmPassword) {
        Swal.fire('Error', 'Please enter and confirm your new password.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        Swal.fire('Error', 'Passwords do not match.', 'error');
        return;
    }

    // Password strength validation
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

    // Show progress
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

    // Send password as plain text for backend encryption
    let passwordToSend = newPassword;
    console.log('Sending plain password to backend for encryption');

    try {
        const response = await fetch(URLPF + 'dao/users/daoPasswordUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                userId: userId,
                newPassword: passwordToSend // ✅ Sin encriptar
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
        console.error('Reset error:', error);
    }
}

/**
 * Reset password strength indicator to blank state
 */
function resetPasswordStrength() {
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');
    
    if (strengthFill) {
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#e74c3c';
        strengthFill.setAttribute('aria-valuenow', '0');
    }
    
    if (strengthLevel) {
        strengthLevel.textContent = 'Weak';
        strengthLevel.style.color = '#e74c3c';
    }
    
    const matchText = document.querySelector('.match-text');
    if (matchText) {
        matchText.textContent = '';
        matchText.className = 'match-text';
    }
}

/**
 * Updates the password strength indicator
 */
function updatePasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');

    if (!strengthFill || !strengthLevel) return;
    
    // Handle empty password
    if (!password) {
        resetPasswordStrength();
        return;
    }

    // Use PasswordManager if available
    if (typeof PasswordManager !== 'undefined') {
        const validation = PasswordManager.validateStrength(password);
        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60'];
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        
        const colorIndex = Math.min(validation.score - 1, colors.length - 1);
        const color = colors[Math.max(0, colorIndex)];
        const label = labels[Math.max(0, colorIndex)];
        const width = Math.max(25, (validation.score / 4) * 100);

        strengthFill.style.width = `${width}%`;
        strengthFill.style.backgroundColor = color;
        strengthFill.setAttribute('aria-valuenow', validation.score * 25);
        strengthLevel.textContent = label;
        strengthLevel.style.color = color;
    } else {
        // Fallback method
        updatePasswordStrengthFallback();
    }
}

/**
 * Fallback password strength update
 */
function updatePasswordStrengthFallback() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');

    if (!strengthFill || !strengthLevel) return;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    let level = 'Weak';
    let color = '#e74c3c';
    let width = '25%';
    let ariaValue = 25;

    if (strength >= 4) {
        level = 'Strong';
        color = '#27ae60';
        width = '100%';
        ariaValue = 100;
    } else if (strength >= 3) {
        level = 'Good';
        color = '#f1c40f';
        width = '75%';
        ariaValue = 75;
    } else if (strength >= 2) {
        level = 'Fair';
        color = '#f39c12';
        width = '50%';
        ariaValue = 50;
    }

    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;
    strengthFill.setAttribute('aria-valuenow', ariaValue);
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
        matchText.className = 'match-text';
        return;
    }

    if (password === confirmPassword) {
        matchText.textContent = 'Passwords match';
        matchText.className = 'match-text match';
    } else {
        matchText.textContent = 'Passwords do not match';
        matchText.className = 'match-text no-match';
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
 * Set base URLs if not defined
 */
if (typeof window.URLPF === 'undefined') {
    window.URLPF = 'https://grammermx.com/Logistica/PremiumFreight/';
}

if (typeof window.URLM === 'undefined') {
    window.URLM = 'https://grammermx.com/Jesus/Mailer/';
}

console.log('Password Reset JS fully loaded');