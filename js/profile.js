/**
 * User Profile Management
 * 
 * This module handles user profile functionality including:
 * - Password visibility toggling
 * - Loading user statistics  
 * - Profile information updates
 * - Password changes with encryption
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load PasswordManager if not already loaded
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = function() {
            console.log('PasswordManager loaded for profile management');
            setupPasswordValidation();
        };
        document.head.appendChild(script);
    } else {
        setupPasswordValidation();
    }
    
    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            } else {
                input.type = 'password';
                if (icon) {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            }
        });
    });
    
    // Load user statistics
    loadUserStats();
    
    // Update profile handler
    const updateProfileBtn = document.getElementById('update-profile');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', updateProfile);
    }
});

/**
 * Setup password validation with PasswordManager
 */
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordFeedback = document.getElementById('password-feedback');
    const strengthIndicator = document.getElementById('password-strength-indicator');
    
    // Setup PasswordManager strength validation if available
    if (newPasswordInput && strengthIndicator && typeof PasswordManager !== 'undefined') {
        // Create strength indicator HTML if it doesn't exist
        if (!strengthIndicator.querySelector('.progress-bar')) {
            strengthIndicator.innerHTML = `
                <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; margin-top: 5px;">
                    <div class="progress-bar" style="height: 100%; border-radius: 2px; transition: all 0.3s ease; width: 0%;"></div>
                </div>
                <small class="strength-level" style="font-size: 12px; margin-top: 2px; display: block;"></small>
            `;
        }
        PasswordManager.setupPasswordField(newPasswordInput, strengthIndicator);
    }
    
    if (newPasswordInput && confirmPasswordInput) {
        // Real-time validation for password match
        function checkPasswordMatch() {
            if (!newPasswordInput.value && !confirmPasswordInput.value) {
                // Both fields empty, clear feedback
                if (passwordFeedback) {
                    passwordFeedback.textContent = '';
                    passwordFeedback.classList.remove('text-success', 'text-danger');
                }
                return;
            }
            
            if (newPasswordInput.value === confirmPasswordInput.value) {
                if (passwordFeedback) {
                    passwordFeedback.textContent = '✓ Passwords match';
                    passwordFeedback.classList.remove('text-danger');
                    passwordFeedback.classList.add('text-success');
                }
            } else {
                if (passwordFeedback) {
                    passwordFeedback.textContent = '✗ Passwords do not match';
                    passwordFeedback.classList.remove('text-success');
                    passwordFeedback.classList.add('text-danger');
                }
            }
        }
        
        // Add event listeners for input event
        newPasswordInput.addEventListener('input', checkPasswordMatch);
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

/**
 * Loads and displays user statistics
 */
async function loadUserStats() {
    try {
        const response = await fetch(URLPF + 'dao/users/daoUserStats.php');
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateStatElement('orders-created', data.created || 0);
            updateStatElement('orders-approved', data.approved || 0);
            updateStatElement('orders-rejected', data.rejected || 0);
        } else {
            console.error('Error loading user stats:', data.message);
            markStatsAsUnavailable();
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        markStatsAsUnavailable('Error');
    }
}

/**
 * Updates a statistic element with a value
 * @param {string} elementId - ID of the element to update
 * @param {number|string} value - Value to display
 */
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        
        // Add animation class if it's a number greater than 0
        if (typeof value === 'number' && value > 0) {
            element.classList.add('stat-highlight');
            setTimeout(() => {
                element.classList.remove('stat-highlight');
            }, 1500);
        }
    }
}

/**
 * Marks all stats as unavailable
 * @param {string} message - Message to display (default: 'N/A')
 */
function markStatsAsUnavailable(message = 'N/A') {
    updateStatElement('orders-created', message);
    updateStatElement('orders-approved', message);
    updateStatElement('orders-rejected', message);
}

/**
 * Handles the profile update process
 */
async function updateProfile() {
    // Show loading indicator
    const updateBtn = document.getElementById('update-profile');
    const originalBtnText = updateBtn.textContent;
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    
    const username = document.getElementById('username').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Basic validation
    if (!username) {
        showError('Please enter your name');
        resetButton();
        return;
    }
    
    // Only validate passwords if the user is trying to change them
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
            showError('Please enter your current password');
            resetButton();
            return;
        }
        
        if (!newPassword) {
            showError('Please enter your new password');
            resetButton();
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            resetButton();
            return;
        }
        
        // NUEVO: Validar fortaleza con PasswordManager si está disponible
        if (typeof PasswordManager !== 'undefined') {
            const passwordValidation = PasswordManager.validateStrength(newPassword);
            if (!passwordValidation.isValid) {
                showError(passwordValidation.message);
                resetButton();
                return;
            }
        } else {
            // Fallback password validation
            if (newPassword.length < 8) {
                showError('New password must be at least 8 characters long');
                resetButton();
                return;
            }
        }
    }
    
    // NUEVO: Encriptar contraseñas antes de enviar
    let currentPasswordToSend = currentPassword;
    let newPasswordToSend = newPassword;
    
    if (currentPassword && typeof PasswordManager !== 'undefined') {
        currentPasswordToSend = PasswordManager.prepareForSubmission(currentPassword);
        console.log('Current password encrypted for verification');
    }
    
    if (newPassword && typeof PasswordManager !== 'undefined') {
        newPasswordToSend = PasswordManager.prepareForSubmission(newPassword);
        console.log('New password encrypted for update');
    }
    
    // Prepare data for update
    const updateData = {
        name: username,
        current_password: currentPasswordToSend,
        new_password: newPasswordToSend || null
    };
    
    // Show detailed loading message
    if (newPassword) {
        Swal.fire({
            title: 'Updating Profile',
            html: `
                <div style="text-align: left;">
                    <p><i class="fas fa-user"></i> Updating profile information...</p>
                    <p><i class="fas fa-key"></i> Verifying current password...</p>
                    <p><i class="fas fa-shield-alt"></i> Encrypting new password...</p>
                    <p><i class="fas fa-database"></i> Saving changes...</p>
                </div>
            `,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }
    
    try {
        const response = await fetch(URLPF + 'dao/users/daoUserUpdate.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Close any existing loading modal
            Swal.close();
            
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Success',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Your profile has been updated successfully</strong></p>
                        ${newPassword ? '<p><i class="fas fa-shield-alt text-success"></i> Password encrypted and secured</p>' : ''}
                        <p><i class="fas fa-check text-success"></i> All changes saved to your account</p>
                    </div>
                `
            }).then(() => {
                // Refresh the page to show updated info
                window.location.reload();
            });
        } else {
            // Show error message
            Swal.close();
            showError(result.message || 'An error occurred while updating your profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        Swal.close();
        showError('An unexpected error occurred. Please try again later.');
    } finally {
        // Reset button regardless of outcome
        resetButton();
    }
    
    // Helper function to reset button state
    function resetButton() {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalBtnText;
    }
    
    // Helper function to show error
    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
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