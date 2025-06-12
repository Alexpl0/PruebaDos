/**
 * Premium Freight - User Registration Module
 * 
 * Handles the user registration process including form submission,
 * validation, and password visibility toggling.
 */

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Add password strength validation
    const passwordField = document.getElementById('password');
    const strengthIndicator = document.getElementById('password-strength');
    
    if (passwordField && strengthIndicator) {
        passwordField.addEventListener('input', function() {
            validatePasswordStrength(this.value, strengthIndicator);
        });
    }
});

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
    const password = passwordInput.value.trim();
    
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
    
    // Password validation
    if (password.length < 8) {
        Swal.fire('Error', 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    // Disable form and show loading - DECLARE ORIGINALTEXT OUTSIDE
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    let originalText = ''; // Declare outside of if block
    
    if (submitButton) {
        originalText = submitButton.innerHTML; // Assign here
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    }
    
    // Prepare data - NOW INCLUDING PLANT
    const data = { name, email, plant, password };
    
    // Submit registration
    submitRegistration(data)
        .then(response => {
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: response.mensaje || 'Registration successful!',
                    confirmButtonText: 'Login Now'
                }).then(() => {
                    window.location.href = 'index.php';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: response.mensaje || 'Unable to register the user.'
                });
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to register the user. Please try again later.'
            });
        })
        .finally(() => {
            // Re-enable form - NOW ORIGINALTEXT IS ACCESSIBLE
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
 * Validates password strength
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