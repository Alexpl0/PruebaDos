/**
 * Premium Freight - User Registration Module
 * 
 * Handles the user registration process including form submission,
 * validation, and password visibility toggling with encryption.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load PasswordManager if not already loaded
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = function() {
            console.log('PasswordManager loaded for registration');
            setupPasswordStrengthIndicator();
        };
        document.head.appendChild(script);
    } else {
        setupPasswordStrengthIndicator();
    }
    
    // Set up form submission handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    } else {
        console.error('Registration form not found');
    }
    
    // Set up password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cambiar el icono
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});

/**
 * Setup password strength indicator with PasswordManager
 */
function setupPasswordStrengthIndicator() {
    const passwordField = document.getElementById('password');
    const strengthIndicator = document.getElementById('password-strength');
    
    if (passwordField && strengthIndicator && typeof PasswordManager !== 'undefined') {
        // Use PasswordManager for strength validation
        PasswordManager.setupPasswordField(passwordField, strengthIndicator);
        
        // Add custom strength indicator HTML if it doesn't exist
        if (!strengthIndicator.querySelector('.progress-bar')) {
            strengthIndicator.innerHTML = `
                <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; margin-top: 5px;">
                    <div class="progress-bar" style="height: 100%; border-radius: 2px; transition: all 0.3s ease; width: 0%;"></div>
                </div>
                <small class="strength-level" style="font-size: 12px; margin-top: 2px; display: block;"></small>
            `;
        }
    } else if (passwordField && strengthIndicator) {
        // Fallback to basic validation if PasswordManager not available
        passwordField.addEventListener('input', function() {
            validatePasswordStrength(this.value, strengthIndicator);
        });
    }
}

/**
 * Handles the registration form submission
 * @param {Event} e - The form submission event
 */
function handleRegistration(e) {
    e.preventDefault();
    
    // Get form fields
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const plantsInput = document.getElementById('plant');
    const passwordInput = document.getElementById('password');
    
    if (!nameInput || !emailInput || !plantsInput || !passwordInput) {
        Swal.fire('Error', 'Form fields not found', 'error');
        return;
    }
    
    // Get and trim field values
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const plant = plantsInput.value.trim();
    const password = passwordInput.value.trim(); // ✅ MANTENER CONTRASEÑA ORIGINAL
    
    // Basic validation
    if (!name || !email || !plant || !password) {
        Swal.fire('Error', 'Please fill in all fields', 'error');
        return;
    }
    
    // Email validation
    if (!isValidEmail(email)) {
        Swal.fire('Error', 'Please enter a valid email address', 'error');
        return;
    }
    
    // NUEVO: Validación de fortaleza de contraseña usando PasswordManager
    if (typeof PasswordManager !== 'undefined') {
        const passwordValidation = PasswordManager.validateStrength(password);
        if (!passwordValidation.isValid) {
            Swal.fire('Error', passwordValidation.message, 'error');
            return;
        }
    } else {
        // Fallback password validation
        if (password.length < 8) {
            Swal.fire('Error', 'Password must be at least 8 characters long', 'error');
            return;
        }
    }
    
    // Disable form and show loading - DECLARE ORIGINALTEXT OUTSIDE
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    let originalText = ''; // Declare outside of if block
    
    if (submitButton) {
        originalText = submitButton.innerHTML; // Assign here
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    }
    
    // ✅ CRÍTICO: NO ENCRIPTAR EN FRONTEND - Solo enviar contraseña original
    const passwordToSend = password; // ✅ Enviar contraseña sin encriptar
    console.log('Sending plain password to backend for encryption');
    
    // Prepare data - NOW INCLUDING PLANT and plain password
    const data = { name, email, plant, password: passwordToSend };
    
    // Submit registration
    submitRegistration(data)
        .then(response => {
            if (response.success) {
                // ✅ MEJORAR: Manejo basado en email_status
                let message = response.mensaje;
                let icon = 'success';
                
                if (response.email_status === 'sent') {
                    message += '\n\nPlease check your email (including spam folder) for the verification link.';
                } else if (response.email_status === 'pending' || response.email_status === 'error') {
                    message += '\n\nIf you don\'t receive the verification email, you can request a new one from the login page.';
                    icon = 'warning';
                }
                
                Swal.fire({
                    icon: icon,
                    title: 'Registration Successful!',
                    text: message,
                    confirmButtonText: 'Go to Login',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redirigir al login o página de verificación
                        window.location.href = URLPF + 'index.php';
                    }
                });
                
                // Limpiar formulario
                document.getElementById('register-form').reset();
                
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: response.mensaje || 'Please try again.'
                });
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Please try again later.'
            });
        })
        .finally(() => {
            // ✅ Re-habilitar botón
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
}

/**
 * Submits registration data to the server
 * @param {Object} data - The registration data
 * @returns {Promise<Object>} - The server response
 */
async function submitRegistration(data) {
    try {
        const response = await fetch(URLPF + 'dao/users/daoSingin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error during registration:', error);
        throw error;
    }
}

/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates password strength (Fallback function)
 * @param {string} password - The password to validate
 * @param {HTMLElement} indicator - The strength indicator element
 */
function validatePasswordStrength(password, indicator) {
    // Skip validation for empty passwords
    if (!password) {
        indicator.textContent = '';
        indicator.className = '';
        return;
    }
    
    // Check length
    if (password.length < 8) {
        indicator.textContent = 'Weak - Too short';
        indicator.className = 'text-danger';
        return;
    }
    
    // Check for variety of characters
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    
    // Set indicator based on strength
    if (strength <= 2) {
        indicator.textContent = 'Moderate';
        indicator.className = 'text-warning';
    } else if (strength === 3) {
        indicator.textContent = 'Strong';
        indicator.className = 'text-success';
    } else {
        indicator.textContent = 'Very Strong';
        indicator.className = 'text-success';
    }
}

/**
 * Verificación de disponibilidad de la variable URLPF
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URLPF is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}

const endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailVerification.php';