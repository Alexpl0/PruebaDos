/**
 * User Profile Management (Refactored)
 * - Lee la configuración desde `window.PF_CONFIG`.
 * - Maneja la actualización del perfil y el cambio de contraseña.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Asegurarse de que PasswordManager esté disponible
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = () => setupPasswordValidation();
        document.head.appendChild(script);
    } else {
        setupPasswordValidation();
    }
    
    // Configurar eventos
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            }
        });
    });
    
    loadUserStats();
    
    document.getElementById('update-profile')?.addEventListener('click', updateProfile);
});

/**
 * Configura la validación de contraseñas usando PasswordManager.
 */
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('new-password');
    const strengthIndicator = document.getElementById('password-strength-indicator');
    
    if (newPasswordInput && strengthIndicator && typeof PasswordManager !== 'undefined') {
        PasswordManager.setupPasswordField(newPasswordInput, strengthIndicator);
    }
    
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordFeedback = document.getElementById('password-feedback');
    
    function checkPasswordMatch() {
        if (!newPasswordInput.value && !confirmPasswordInput.value) {
            passwordFeedback.textContent = '';
            return;
        }
        if (newPasswordInput.value === confirmPasswordInput.value) {
            passwordFeedback.textContent = '✓ Passwords match';
            passwordFeedback.className = 'mt-2 text-success';
        } else {
            passwordFeedback.textContent = '✗ Passwords do not match';
            passwordFeedback.className = 'mt-2 text-danger';
        }
    }
    
    newPasswordInput?.addEventListener('input', checkPasswordMatch);
    confirmPasswordInput?.addEventListener('input', checkPasswordMatch);
}

/**
 * Carga y muestra las estadísticas del usuario.
 */
async function loadUserStats() {
    const URLPF = window.PF_CONFIG.app.baseURL;
    try {
        const response = await fetch(`${URLPF}dao/users/daoUserStats.php`);
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('orders-created').textContent = data.created || 0;
            document.getElementById('orders-approved').textContent = data.approved || 0;
            document.getElementById('orders-rejected').textContent = data.rejected || 0;
        } else {
            throw new Error(data.message || 'Failed to load stats');
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        ['orders-created', 'orders-approved', 'orders-rejected'].forEach(id => {
            document.getElementById(id).textContent = 'N/A';
        });
    }
}

/**
 * Maneja el proceso de actualización del perfil.
 */
async function updateProfile() {
    const updateBtn = document.getElementById('update-profile');
    const originalBtnText = updateBtn.innerHTML;
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';

    const username = document.getElementById('username').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    try {
        if (!username) throw new Error('Please enter your name');

        if (currentPassword || newPassword || confirmPassword) {
            if (!currentPassword) throw new Error('Please enter your current password');
            if (newPassword !== confirmPassword) throw new Error('New passwords do not match');
            if (typeof PasswordManager !== 'undefined' && !PasswordManager.validateStrength(newPassword).isValid) {
                throw new Error(PasswordManager.validateStrength(newPassword).message);
            }
        }

        const updateData = {
            name: username,
            current_password: currentPassword,
            new_password: newPassword || null
        };
        
        const URLPF = window.PF_CONFIG.app.baseURL;
        const response = await fetch(`${URLPF}dao/users/daoUserUpdate.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'An error occurred');

        await Swal.fire({ icon: 'success', title: 'Success', text: 'Your profile has been updated successfully.' });
        window.location.reload();

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalBtnText;
    }
}
