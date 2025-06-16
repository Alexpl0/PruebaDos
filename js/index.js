/**
 * index.js
 * Handles login functionality for the Premium Freight application
 * Includes form validation and session management with password encryption
 */

// Load PasswordManager
document.addEventListener('DOMContentLoaded', function() {
    // Load PasswordManager if not already loaded
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = function() {
            console.log('PasswordManager loaded for login');
        };
        document.head.appendChild(script);
    }
});

// Functionality to show/hide password
document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    
    // Add Enter key support for login
    const emailInput = document.getElementById('email');
    if (emailInput && passwordInput) {
        [emailInput, passwordInput].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loginUsuario();
                }
            });
        });
    }
});

/**
 * Function to process user login
 * Validates fields and sends request to server
 */
async function loginUsuario() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');
    
    // Validaciones básicas
    if (!email) {
        Swal.fire({
            icon: 'warning',
            title: 'Email Required',
            text: 'Please enter your email address',
            confirmButtonColor: 'var(--first-color)'
        });
        return;
    }
    
    if (!password) {
        Swal.fire({
            icon: 'warning',
            title: 'Password Required',
            text: 'Please enter your password',
            confirmButtonColor: 'var(--first-color)'
        });
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Email',
            text: 'Please enter a valid email address',
            confirmButtonColor: 'var(--first-color)'
        });
        return;
    }
    
    // Mostrar estado de carga
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
    
    try {
        // CORRECCIÓN: Usar el método correcto del PasswordManager
        let encryptedPassword = password;
        if (typeof PasswordManager !== 'undefined' && PasswordManager.encrypt) {
            encryptedPassword = PasswordManager.encrypt(password);
            console.log('Password encrypted for transmission');
        } else {
            console.warn('PasswordManager not available, sending plain password');
        }
        
        const response = await fetch(`${URLPF}dao/users/loginValidation.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: encryptedPassword
            })
        });
        
        console.log('Response status:', response.status);
        
        // Manejar diferentes códigos de estado
        if (response.status === 401) {
            throw new Error('Invalid credentials');
        }
        
        if (response.status === 404) {
            throw new Error('Login service not found');
        }
        
        if (response.status === 500) {
            throw new Error('Server error');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.status === 'success' || data.success) {
            // Login exitoso - manejar ambos formatos de respuesta
            const userData = data.data || data.user || {};
            const userName = userData.name || 'User';
            
            Swal.fire({
                icon: 'success',
                title: 'Login Successful!',
                text: `Welcome back, ${userName}!`,
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: 'var(--first-color)'
            }).then(() => {
                // Redireccionar después del mensaje
                window.location.href = 'newOrder.php';
            });
        } else {
            // Login fallido
            let errorMessage = 'Login failed';
            
            if (data.mensaje) {
                errorMessage = data.mensaje;
            } else if (data.message) {
                errorMessage = data.message;
            } else if (data.error) {
                errorMessage = data.error;
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: errorMessage,
                confirmButtonColor: 'var(--first-color)'
            });
        }
        
    } catch (error) {
        console.error('Error during login process:', error);
        
        let errorMessage = 'An unexpected error occurred';
        let errorTitle = 'Login Error';
        
        if (error.message === 'Invalid credentials') {
            errorTitle = 'Invalid Credentials';
            errorMessage = 'The email or password you entered is incorrect. Please try again.';
        } else if (error.message === 'Login service not found') {
            errorTitle = 'Service Unavailable';
            errorMessage = 'The login service is currently unavailable. Please try again later.';
        } else if (error.message === 'Server error') {
            errorTitle = 'Server Error';
            errorMessage = 'There was a problem with the server. Please try again later.';
        } else if (error.message.includes('Failed to fetch')) {
            errorTitle = 'Connection Error';
            errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        }
        
        Swal.fire({
            icon: 'error',
            title: errorTitle,
            text: errorMessage,
            confirmButtonColor: 'var(--first-color)'
        });
        
    } finally {
        // Restaurar estado del botón
        btnLogin.classList.remove('loading');
        btnLogin.disabled = false;
    }
}

// Función global para mantener compatibilidad
window.loginUsuario = loginUsuario;

/**
 * Verification of URL variable availability
 * In case the script loads before the variable is defined
 */
if (typeof URLPF === 'undefined' || typeof URLPF === 'function' || URLPF === null) {
    console.warn('URLPF global variable is not properly defined. Using fallback URL.');
    window.URLPF = 'https://grammermx.com/Jesus/PruebaDos/';
} else {
    console.log('URLPF correctly defined as:', URLPF);
}