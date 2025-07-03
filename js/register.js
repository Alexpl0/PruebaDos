/**
 * register.js (Completo y Corregido)
 * Handles user registration, reading configuration from window.PF_CONFIG,
 * and providing detailed feedback on verification email status.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Carga diferida de PasswordManager
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = () => PasswordManager.setupPasswordField(document.getElementById('password'), document.getElementById('passwordStrength'));
        document.head.appendChild(script);
    } else {
        PasswordManager.setupPasswordField(document.getElementById('password'), document.getElementById('passwordStrength'));
    }
    
    document.getElementById('register-form')?.addEventListener('submit', handleRegistration);
    
    // Toggle para mostrar/ocultar contraseña
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

async function handleRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        if (!data.name || !data.email || !data.plant || !data.password) {
            throw new Error('Please fill in all fields');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new Error('Please enter a valid email address format.');
        }

        if (typeof PasswordManager !== 'undefined' && !PasswordManager.validateStrength(data.password).isValid) {
            throw new Error(PasswordManager.validateStrength(data.password).message);
        }

        const URLPF = window.PF_CONFIG.app.baseURL;
        const response = await fetch(`${URLPF}dao/users/daoSingin.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.mensaje || 'Registration failed');
        }

        // --- LÓGICA DE VERIFICACIÓN DE EMAIL RESTAURADA ---
        let message = result.mensaje;
        let icon = 'success';
        
        if (result.email_status === 'sent') {
            message += '\n\nPlease check your email (including spam folder) for the verification link.';
        } else if (result.email_status === 'pending' || result.email_status === 'error') {
            message += '\n\nIf you don\'t receive the verification email, you can request a new one from the login page.';
            icon = 'warning'; // Cambiar a advertencia si el correo no se pudo enviar.
        }
        
        await Swal.fire({
            icon: icon,
            title: 'Registration Successful!',
            text: message,
            confirmButtonText: 'Go to Login',
            allowOutsideClick: false
        });

        window.location.href = 'index.php';

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Registration Failed', text: error.message });
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}
