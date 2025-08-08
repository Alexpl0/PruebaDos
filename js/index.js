/**
 * index.js (VERSIÓN CORREGIDA)
 * Handles login and verification resend functionality.
 * CAMBIO PRINCIPAL: Las contraseñas se envían en texto plano al backend
 */

document.addEventListener('DOMContentLoaded', function() {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) btnLogin.disabled = true;

    // Ya no necesitamos PasswordManager en el frontend para login
    // Solo para otras funciones si las tienes
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = () => { if (btnLogin) btnLogin.disabled = false; };
        document.head.appendChild(script);
    } else {
        if (btnLogin) btnLogin.disabled = false;
    }

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    document.querySelectorAll('#email, #password').forEach(input => {
        input.addEventListener('keypress', e => { if (e.key === 'Enter') loginUsuario(); });
    });
});

/**
 * Handles the logic to resend a verification email.
 * @param {string} email - The user's email address.
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
 * FUNCIÓN DE LOGIN CORREGIDA
 * Ahora envía la contraseña en texto plano siempre
 */
async function loginUsuario() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');

    const email = emailInput.value.trim();
    const password = passwordInput.value; // TEXTO PLANO - sin encriptar

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
        // CAMBIO CRÍTICO: Enviar contraseña en texto plano
        const requestBody = { 
            email, 
            password, // Sin encriptar - el backend se encarga
            action: 'login' 
        };

        // Para debugging (remover en producción)
        console.log('Sending login request:', {
            email,
            passwordLength: password.length,
            // No logear la contraseña real por seguridad
            passwordSample: password.substring(0, 3) + '...'
        });

        const response = await fetch(`${URLPF}dao/users/daoLogin.php?debug=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        // Para debugging (remover en producción)
        if (data.debug) {
            console.log('Server debug info:', data.debug);
        }
        
        if (!response.ok) {
            // Manejo específico para usuario no verificado
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
                // Otros errores HTTP (401, 404, etc.)
                throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            }
        } else if (data.success && data.user) {
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

// Hacer la función global para el `onclick` del HTML
window.loginUsuario = loginUsuario;

/**
 * FUNCIÓN AUXILIAR PARA DEBUGGING
 * Permite probar diferentes contraseñas y ver qué pasa
 */
function testPasswordEncryption(password) {
    if (typeof PasswordManager !== 'undefined') {
        const encrypted = PasswordManager.encrypt(password);
        console.log('Testing password:', {
            original: password,
            originalLength: password.length,
            encrypted: encrypted,
            encryptedLength: encrypted.length,
            decrypted: PasswordManager.decrypt(encrypted)
        });
        return encrypted;
    } else {
        console.log('PasswordManager not available');
        return null;
    }
}

// Hacer disponible para debugging
window.testPasswordEncryption = testPasswordEncryption;

/**
 * Nueva función para manejar la sesión del usuario
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
            // La sesión es válida, redirigir
            window.location.href = 'newOrder.php';
        }
        // Si no hay sesión válida, permanecer en login
    } catch (error) {
        console.log('Session check failed:', error.message);
        // Continuar en la página de login
    }
}

// Llamar a la función de manejo de sesión al cargar la página
document.addEventListener('DOMContentLoaded', handleUserSession);