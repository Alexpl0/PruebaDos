/**
 * Password Reset JavaScript
 * Handles reset requests and password changes
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const resetForm = document.getElementById('reset-form');
    const resetBtn = document.getElementById('reset-btn');
    
    // Elementos de indicadores
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');
    const matchText = document.querySelector('.match-text');
    
    // Funcionalidad de toggle password
    document.querySelectorAll('.toggle-password-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                targetInput.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
    
    // Función para evaluar fortaleza de contraseña
    function evaluatePasswordStrength(password) {
        let score = 0;
        let feedback = [];
        
        // Longitud
        if (password.length >= 8) score += 25;
        else feedback.push('At least 8 characters');
        
        // Mayúsculas
        if (/[A-Z]/.test(password)) score += 25;
        else feedback.push('One uppercase letter');
        
        // Minúsculas
        if (/[a-z]/.test(password)) score += 25;
        else feedback.push('One lowercase letter');
        
        // Números o símbolos
        if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 25;
        else feedback.push('One number or symbol');
        
        let level = 'Weak';
        if (score >= 100) level = 'Strong';
        else if (score >= 75) level = 'Good';
        else if (score >= 50) level = 'Fair';
        
        return { score, level, feedback };
    }
    
    // Actualizar indicador de fortaleza
    function updatePasswordStrength() {
        const password = newPasswordInput.value;
        const { score, level } = evaluatePasswordStrength(password);
        
        strengthFill.style.width = score + '%';
        strengthFill.setAttribute('aria-valuenow', score);
        strengthLevel.textContent = level;
        
        // Cambiar color según el nivel
        strengthLevel.className = 'strength-level';
        if (level === 'Weak') strengthLevel.style.color = 'var(--danger)';
        else if (level === 'Fair') strengthLevel.style.color = '#f59e0b';
        else if (level === 'Good') strengthLevel.style.color = '#3b82f6';
        else if (level === 'Strong') strengthLevel.style.color = 'var(--success)';
    }
    
    // Verificar coincidencia de contraseñas
    function checkPasswordMatch() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword === '') {
            matchText.textContent = '';
            matchText.className = 'match-text';
            return;
        }
        
        if (newPassword === confirmPassword) {
            matchText.textContent = '✓ Passwords match';
            matchText.className = 'match-text match';
        } else {
            matchText.textContent = '✗ Passwords do not match';
            matchText.className = 'match-text no-match';
        }
    }
    
    // Event listeners para los inputs
    newPasswordInput.addEventListener('input', function() {
        updatePasswordStrength();
        checkPasswordMatch();
    });
    
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    
    // Manejar envío del formulario
    resetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const token = document.getElementById('reset-token').value;
        const userId = document.getElementById('user-id').value;
        
        // Validaciones
        if (!newPassword || !confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please fill in all fields'
            });
            return;
        }
        
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Passwords do not match'
            });
            return;
        }
        
        const { score } = evaluatePasswordStrength(newPassword);
        if (score < 50) {
            Swal.fire({
                icon: 'warning',
                title: 'Weak Password',
                text: 'Please choose a stronger password'
            });
            return;
        }
        
        // Deshabilitar botón durante el proceso
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        
        // Enviar solicitud
        const formData = new FormData();
        formData.append('action', 'reset_password');
        formData.append('token', token);
        formData.append('user_id', userId);
        formData.append('new_password', newPassword);
        
        fetch(URLPF + 'dao/users/password_recovery_actions.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your password has been reset successfully',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    window.location.href = 'index.php';
                });
            } else {
                throw new Error(data.message || 'Failed to reset password');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'An error occurred while resetting your password'
            });
        })
        .finally(() => {
            // Rehabilitar botón
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-key"></i> Reset Password';
        });
    });
});

function initializePasswordReset() {
    // If we're on the recovery page, initialize email sending
    if (document.getElementById('recovery-form')) {
        initializeRecoveryForm();
    }
    
    // If we're on the reset page, initialize password change
    if (document.getElementById('reset-form')) {
        initializeResetForm();
    }
}

/**
 * Initialize recovery request form
 */
function initializeRecoveryForm() {
    const form = document.getElementById('recovery-form');
    if (!form) return;
    
    form.addEventListener('submit', handleRecoverySubmit);
}

/**
 * Handle recovery request submission
 */
async function handleRecoverySubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please enter your email address.'
        });
        return;
    }
    
    if (!isValidEmail(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please enter a valid email address.'
        });
        return;
    }
    
    // Show loading
    Swal.fire({
        title: 'Sending request...',
        text: 'Please wait while we process your request',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await fetch(URLPF + 'dao/users/daoPasswordReset.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Email sent',
                html: `
                    <p>A recovery email has been sent to <strong>${email}</strong></p>
                    <p><small>Check your inbox and spam folder. The link expires in 24 hours.</small></p>
                `,
                confirmButtonText: 'Got it'
            }).then(() => {
                // Clear form
                document.getElementById('email').value = '';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error sending recovery email.'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection error',
            text: 'Could not connect to server. Please try again.'
        });
    }
}

/**
 * Initialize password reset form
 */
function initializeResetForm() {
    const form = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (!form || !newPasswordInput || !confirmPasswordInput) return;
    
    // Event listeners
    form.addEventListener('submit', handleResetSubmit);
    newPasswordInput.addEventListener('input', updatePasswordStrength);
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });
    
    // Initial check for URL parameters
    checkUrlParameters();
}

/**
 * Check URL parameters to show error messages
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        let title = 'Error';
        let message = 'An error has occurred.';
        
        switch (error) {
            case 'invalid_token':
                title = 'Invalid link';
                message = 'The recovery link is invalid or has been modified.';
                break;
            case 'token_expired':
                title = 'Link expired';
                message = 'The recovery link has expired. Links are valid for 24 hours.';
                break;
            case 'token_used':
                title = 'Link already used';
                message = 'This recovery link has already been used and cannot be used again.';
                break;
        }
        
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonText: 'Request new link'
        }).then(() => {
            window.location.href = 'recovery.php';
        });
    }
}

/**
 * Handle password reset submission
 */
async function handleResetSubmit(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const token = document.getElementById('reset-token').value;
    const userId = document.getElementById('user-id').value;
    
    // Validations
    if (!newPassword || !confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please fill in all fields.'
        });
        return;
    }
    
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Passwords do not match.'
        });
        return;
    }
    
    if (!isStrongPassword(newPassword)) {
        Swal.fire({
            icon: 'error',
            title: 'Weak password',
            text: 'Password must be at least 8 characters long and include letters and numbers.'
        });
        return;
    }
    
    // Show loading
    Swal.fire({
        title: 'Updating password...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const response = await fetch(URLPF + 'dao/users/daoPasswordUpdate.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                userId: userId,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Password updated!',
                text: 'Your password has been successfully changed.',
                confirmButtonText: 'Go to login'
            }).then(() => {
                window.location.href = 'index.php';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error updating password.'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection error',
            text: 'Could not connect to server. Please try again.'
        });
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(event) {
    const button = event.target.closest('.password-toggle');
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.querySelector('.strength-fill');
    const strengthLevel = document.querySelector('.strength-level');
    
    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthLevel.textContent = 'Weak';
        strengthLevel.className = 'strength-level weak';
        return;
    }
    
    let strength = 0;
    
    // Length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Upper and lowercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    
    // Numbers
    if (/\d/.test(password)) strength++;
    
    // Special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    // Update UI
    strengthFill.className = 'strength-fill';
    strengthLevel.className = 'strength-level';
    
    if (strength <= 1) {
        strengthFill.classList.add('weak');
        strengthLevel.classList.add('weak');
        strengthLevel.textContent = 'Weak';
    } else if (strength <= 2) {
        strengthFill.classList.add('fair');
        strengthLevel.classList.add('fair');
        strengthLevel.textContent = 'Fair';
    } else if (strength <= 3) {
        strengthFill.classList.add('good');
        strengthLevel.classList.add('good');
        strengthLevel.textContent = 'Good';
    } else {
        strengthFill.classList.add('strong');
        strengthLevel.classList.add('strong');
        strengthLevel.textContent = 'Strong';
    }
    
    // Also check match if there's confirmation
    checkPasswordMatch();
}

/**
 * Check password match
 */
function checkPasswordMatch() {
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const matchText = document.querySelector('.match-text');
    
    if (!confirmPassword) {
        matchText.textContent = '';
        matchText.className = 'match-text';
        return;
    }
    
    if (password === confirmPassword) {
        matchText.textContent = '✓ Passwords match';
        matchText.className = 'match-text match';
    } else {
        matchText.textContent = '✗ Passwords do not match';
        matchText.className = 'match-text no-match';
    }
}

/**
 * Validate email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if password is strong
 */
function isStrongPassword(password) {
    return password.length >= 8 && 
           /[a-zA-Z]/.test(password) && 
           /\d/.test(password);
}

/**
 * Check URLPF availability
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF not defined. Using fallback.');
    const URLPF = 'https://grammermx.com/Jesus/PruebaDos/';
}