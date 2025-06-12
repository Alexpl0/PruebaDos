/**
 * index.js
 * Handles login functionality for the Premium Freight application
 * Includes form validation and session management
 */

// Functionality to show/hide password
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            // Change input type
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Change icon
            if (type === 'text') {
                togglePassword.classList.remove('fa-eye-slash');
                togglePassword.classList.add('fa-eye');
            } else {
                togglePassword.classList.remove('fa-eye');
                togglePassword.classList.add('fa-eye-slash');
            }
        });
    }
});

// Logic for login form interaction when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to submit form with Enter key
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUsuario();
            }
        });
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUsuario();
            }
        });
    }
    
    // Configure login button if it exists
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', loginUsuario);
    }
});

/**
 * Function to process user login
 * Validates fields and sends request to server
 */
function loginUsuario() {
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Basic client-side validation
    if (!email || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please enter your email and password.'
        });
        return;
    }
    
    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please enter a valid email address.'
        });
        return;
    }

    // Show loading indicator
    Swal.fire({
        title: 'Processing...',
        text: 'Verifying credentials',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Verify that URLPF is a valid string before using it
    const baseURL = (typeof URLPF === 'string') ? URLPF : 'https://grammermx.com/Jesus/PruebaDos/';
    console.log('Using base URL:', baseURL); // For debugging
    
    // Send login request to server using global URL
    fetch(baseURL + 'dao/users/daoLogin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        // Check if response is successful
        if (!response.ok) {
            throw new Error('Server connection error');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // If login is successful, establish session
            fetch(baseURL + 'dao/users/loginSession.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.data)
            })
            .then(sessionResponse => {
                if (!sessionResponse.ok) {
                    throw new Error('Error establishing session');
                }
                return sessionResponse.text();
            })
            .then(() => {
                // Create personalized message with plant information
                const userName = data.data.name || 'User';
                const userPlant = data.data.plant;
                const authLevel = data.data.authorization_level;
                
                let welcomeMessage = `Welcome, ${userName}!`;
                
                // Add plant information if it exists
                if (userPlant && userPlant !== null && userPlant !== '') {
                    welcomeMessage += `\nPlant: ${userPlant}`;
                } else {
                    welcomeMessage += '\nGlobal Access (No assigned plant)';
                }
                
                // Add authorization level
                welcomeMessage += `\nAuthorization level: ${authLevel}`;

                // Show success message with detailed information
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful',
                    html: `
                        <div style="text-align: left; font-size: 14px;">
                            <p><strong>Welcome, ${userName}!</strong></p>
                            <p><i class="fas fa-building"></i> <strong>Plant:</strong> ${userPlant || 'Global Access'}</p>
                            <p><i class="fas fa-user-shield"></i> <strong>Authorization level:</strong> ${authLevel}</p>
                            <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${data.data.email}</p>
                        </div>
                    `,
                    timer: 3000,
                    showConfirmButton: true,
                    confirmButtonText: 'Continue'
                }).then(() => {
                    window.location.href = 'newOrder.php';
                });
            });
        } else {
            // Show error message if credentials are incorrect
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.mensaje || 'Incorrect credentials.'
            });
        }
    })
    .catch(error => {
        // Handle network or server errors
        console.error('Error during login process:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while logging in. Please try again.'
        });
    });
}

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