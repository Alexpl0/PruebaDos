document.addEventListener('DOMContentLoaded', function() {
    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                this.querySelector('ion-icon').setAttribute('name', 'eye-outline');
            } else {
                input.type = 'password';
                this.querySelector('ion-icon').setAttribute('name', 'eye-off-outline');
            }
        });
    });
    
    // Load user statistics
    loadUserStats();
    
    // Update profile handler
    document.getElementById('update-profile').addEventListener('click', updateProfile);
});

async function loadUserStats() {
    try {
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUserStats.php');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('orders-created').textContent = data.created || 0;
            document.getElementById('orders-approved').textContent = data.approved || 0;
            document.getElementById('orders-rejected').textContent = data.rejected || 0;
        } else {
            console.error('Error loading user stats:', data.message);
            document.getElementById('orders-created').textContent = 'N/A';
            document.getElementById('orders-approved').textContent = 'N/A';
            document.getElementById('orders-rejected').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        document.getElementById('orders-created').textContent = 'Error';
        document.getElementById('orders-approved').textContent = 'Error';
        document.getElementById('orders-rejected').textContent = 'Error';
    }
}

async function updateProfile() {
    const username = document.getElementById('username').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Basic validation
    if (!username) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please enter your name'
        });
        return;
    }
    
    // Only validate passwords if the user is trying to change them
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please enter your current password'
            });
            return;
        }
        
        if (!newPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please enter your new password'
            });
            return;
        }
        
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'New passwords do not match'
            });
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
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoUserUpdate.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Your profile has been updated successfully'
            }).then(() => {
                // Refresh the page to show updated info
                window.location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'An error occurred while updating your profile'
            });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again later.'
        });
    }
}