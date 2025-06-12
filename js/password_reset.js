/**
 * Password Reset JavaScript
 * Maneja el envío de solicitudes de reset y el cambio de contraseña
 */

document.addEventListener('DOMContentLoaded', function() {
    initializePasswordReset();
});

function initializePasswordReset() {
    // Si estamos en la página de recovery, inicializar envío de email
    if (document.getElementById('recovery-form')) {
        initializeRecoveryForm();
    }
    
    // Si estamos en la página de reset, inicializar cambio de contraseña
    if (document.getElementById('reset-form')) {
        initializeResetForm();
    }
}

/**
 * Inicializar formulario de solicitud de recuperación
 */
function initializeRecoveryForm() {
    const form = document.getElementById('recovery-form');
    if (!form) return;
    
    form.addEventListener('submit', handleRecoverySubmit);
}

/**
 * Manejar envío de solicitud de recuperación
 */
async function handleRecoverySubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa tu correo electrónico.'
        });
        return;
    }
    
    if (!isValidEmail(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa un correo electrónico válido.'
        });
        return;
    }
    
    // Mostrar loading
    Swal.fire({
        title: 'Enviando solicitud...',
        text: 'Por favor espera mientras procesamos tu solicitud',
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
                title: 'Correo enviado',
                html: `
                    <p>Se ha enviado un correo de recuperación a <strong>${email}</strong></p>
                    <p><small>Revisa tu bandeja de entrada y spam. El enlace expira en 24 horas.</small></p>
                `,
                confirmButtonText: 'Entendido'
            }).then(() => {
                // Limpiar formulario
                document.getElementById('email').value = '';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error al enviar el correo de recuperación.'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor. Intenta nuevamente.'
        });
    }
}

/**
 * Inicializar formulario de reset de contraseña
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
 * Verificar parámetros de URL para mostrar mensajes de error
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        let title = 'Error';
        let message = 'Ha ocurrido un error.';
        
        switch (error) {
            case 'invalid_token':
                title = 'Enlace inválido';
                message = 'El enlace de recuperación no es válido o ha sido modificado.';
                break;
            case 'token_expired':
                title = 'Enlace expirado';
                message = 'El enlace de recuperación ha expirado. Los enlaces son válidos por 24 horas.';
                break;
            case 'token_used':
                title = 'Enlace ya utilizado';
                message = 'Este enlace de recuperación ya ha sido utilizado y no puede usarse nuevamente.';
                break;
        }
        
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonText: 'Solicitar nuevo enlace'
        }).then(() => {
            window.location.href = 'recovery.php';
        });
    }
}

/**
 * Manejar envío de reset de contraseña
 */
async function handleResetSubmit(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const token = document.getElementById('reset-token').value;
    const userId = document.getElementById('user-id').value;
    
    // Validaciones
    if (!newPassword || !confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor completa todos los campos.'
        });
        return;
    }
    
    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Las contraseñas no coinciden.'
        });
        return;
    }
    
    if (!isStrongPassword(newPassword)) {
        Swal.fire({
            icon: 'error',
            title: 'Contraseña débil',
            text: 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.'
        });
        return;
    }
    
    // Mostrar loading
    Swal.fire({
        title: 'Actualizando contraseña...',
        text: 'Por favor espera',
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
                title: '¡Contraseña actualizada!',
                text: 'Tu contraseña ha sido cambiada exitosamente.',
                confirmButtonText: 'Ir al login'
            }).then(() => {
                window.location.href = 'index.php';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error al actualizar la contraseña.'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor. Intenta nuevamente.'
        });
    }
}

/**
 * Alternar visibilidad de contraseña
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
 * Actualizar indicador de fortaleza de contraseña
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
    
    // Longitud
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Mayúsculas y minúsculas
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    
    // Números
    if (/\d/.test(password)) strength++;
    
    // Caracteres especiales
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    // Actualizar UI
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
    
    // También verificar coincidencia si hay confirmación
    checkPasswordMatch();
}

/**
 * Verificar coincidencia de contraseñas
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
 * Validar email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Verificar si la contraseña es fuerte
 */
function isStrongPassword(password) {
    return password.length >= 8 && 
           /[a-zA-Z]/.test(password) && 
           /\d/.test(password);
}

/**
 * Verificar disponibilidad de URLPF
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF not defined. Using fallback.');
    const URLPF = 'https://grammermx.com/Jesus/PruebaDos/';
}