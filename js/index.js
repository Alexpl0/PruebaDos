/**
 * index.js (Completo y Refactorizado)
 * Handles login functionality for the Premium Freight application.
 * Reads configuration from window.PF_CONFIG.
 */
document.addEventListener('DOMContentLoaded', function() {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) btnLogin.disabled = true;

    // Carga diferida de PasswordManager para no bloquear el renderizado
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = () => { if (btnLogin) btnLogin.disabled = false; };
        document.head.appendChild(script);
    } else {
        if (btnLogin) btnLogin.disabled = false;
    }

    // Toggle para mostrar/ocultar contraseña
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Evento de 'Enter' para iniciar sesión
    document.querySelectorAll('#email, #password').forEach(input => {
        input.addEventListener('keypress', e => { if (e.key === 'Enter') loginUsuario(); });
    });
});

async function loginUsuario() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        return Swal.fire('Warning', 'Please enter email and password.', 'warning');
    }

    // --- NUEVA VALIDACIÓN DE EMAIL ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return Swal.fire('Invalid Email', 'Please enter a valid email address format.', 'error');
    }
    // --- FIN DE LA VALIDACIÓN ---
    
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
    
    // Leer la URL base desde el objeto de configuración global
    const URLPF = window.PF_CONFIG.app.baseURL;

    try {
        const response = await fetch(`${URLPF}dao/users/daoLogin.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success && data.user) {
            await Swal.fire({
                icon: 'success', title: 'Login Successful!', text: `Welcome back, ${data.user.name}!`,
                timer: 1500, showConfirmButton: false
            });
            window.location.href = 'newOrder.php';
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: error.message });
    } finally {
        btnLogin.classList.remove('loading');
        btnLogin.disabled = false;
    }
}
// Hacer la función global para el `onclick` del HTML
window.loginUsuario = loginUsuario;
