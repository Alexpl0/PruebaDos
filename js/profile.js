/**
 * User Profile Management
 * 
 * This module handles user profile functionality including:
 * - Password visibility toggling
 * - Loading user statistics
 * - Profile information updates
 * - Password changes
 */

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Add event listeners for password fields
    setupPasswordValidation();
});

/**
 * Sets up real-time password validation
 */
function setupPasswordValidation() {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordFeedback = document.getElementById('password-feedback');
    
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
                    passwordFeedback.textContent = 'Passwords match!';
                    passwordFeedback.classList.remove('text-danger');
                    passwordFeedback.classList.add('text-success');
                }
            } else {
                if (passwordFeedback) {
                    passwordFeedback.textContent = 'Passwords do not match';
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
        const response = await fetch(URL + 'dao/users/daoUserStats.php');
        
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
        
        // Add password strength validation
        if (newPassword.length < 8) {
            showError('New password must be at least 8 characters long');
            resetButton();
            return;
        }
    }
    
    // Prepare data for update
    const updateData = {
        name: username,
        current_password: currentPassword,
        new_password: newPassword || null
    };
    
    try {
        const response = await fetch(URL + 'dao/users/daoUserUpdate.php', {
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
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Your profile has been updated successfully'
            }).then(() => {
                // Refresh the page to show updated info
                window.location.reload();
            });
        } else {
            // Show error message
            showError(result.message || 'An error occurred while updating your profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
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
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}