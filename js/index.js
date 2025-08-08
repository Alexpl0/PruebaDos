/**
 * index.js (VERSIÓN SIMPLIFICADA)
 * Solo envía contraseñas en texto plano. Sin encriptación en frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.disabled = false; // Ya no necesitamos esperar PasswordManager
    }

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Enter key support
    document.querySelectorAll('#email, #password').forEach(input => {
        input.addEventListener('keypress', e => { 
            if (e.key === 'Enter') loginUsuario(); 
        });
    });
});

/**
 * Reenviar email de verificación
 * @param {string} email - Email del usuario
 */
async function resendVerificationEmail(email) {
    try {
        const URLPF = window.PF_CONFIG.app.baseURL;
        const response = await fetch(`${URLPF}dao/users/daoLogin.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, action: 'resend_verification' })
        });
        
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to resend email.');
        }
        return data;
    } catch (error) {
        Swal.showValidationMessage(`Request failed: ${error.message}`);
    }
}

/**
 * FUNCIÓN DE LOGIN SIMPLIFICADA
 * Envía contraseña en texto plano, el backend se encarga del resto
 */
async function loginUsuario() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');

    const email = emailInput.value.trim();
    const password = passwordInput.value; // TEXTO PLANO

    // Validaciones básicas
    if (!email || !password) {
        return Swal.fire('Warning', 'Please enter email and password.', 'warning');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return Swal.fire('Invalid Email', 'Please enter a valid email address format.', 'error');
    }
    
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
    
    const URLPF = window.PF_CONFIG.app.baseURL;

    try {
        // Enviar datos simples: email y contraseña en texto plano
        const requestBody = { 
            email, 
            password, // El backend se encarga de encriptar
            action: 'login' 
        };

        const response = await fetch(`${URLPF}dao/users/daoLogin.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Usuario no verificado
            if (response.status === 403) {
                Swal.fire({
                    title: 'Account Not Verified',
                    text: data.message,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Resend Verification',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#3085d6',
                    showLoaderOnConfirm: true,
                    preConfirm: () => {
                        return resendVerificationEmail(email);
                    },
                    allowOutsideClick: () => !Swal.isLoading()
                }).then((result) => {
                    if (result.isConfirmed) {
                         Swal.fire('Sent!', 'A new verification email has been sent to your address.', 'success');
                    }
                });
            } else {
                // Otros errores (401, 404, etc.)
                throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            }
        } else if (data.success && data.user) {
            // Login exitoso
            await Swal.fire({
                icon: 'success', 
                title: 'Login Successful!', 
                text: `Welcome back, ${data.user.name}!`,
                timer: 1500, 
                showConfirmButton: false
            });
            window.location.href = 'newOrder.php';
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        Swal.fire({ 
            icon: 'error', 
            title: 'Login Failed', 
            text: error.message 
        });
    } finally {
        btnLogin.classList.remove('loading');
        btnLogin.disabled = false;
    }
}

// Hacer la función global
window.loginUsuario = loginUsuario;

/**
 * Manejar sesión existente
 */
async function handleUserSession() {
    try {
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/loginSession.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();
        if (response.ok && data.success) {
            // Sesión válida, redirigir
            window.location.href = 'newOrder.php';
        }
        // Si no hay sesión válida, quedarse en login
    } catch (error) {
        // Error al verificar sesión, quedarse en login
        console.log('Session check failed:', error.message);
    }
}

// Verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', handleUserSession);