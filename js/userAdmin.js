// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\js\userAdmin.js
/**
 * User Administration - JavaScript functionality
 * This file handles the DataTable initialization and CRUD operations for users.
 * 
 * Features:
 * - User listing with DataTable
 * - Add, Edit, Delete user operations
 * - Form validation and AJAX submission with password encryption
 * - Export to Excel and PDF
 *  
 * @author Alejandro Perez
 * @version 1.0.0
 */

//=====================================================================================================
// Global variable to store the DataTable instance
let usersTable;

// Load PasswordManager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load PasswordManager if not already loaded
    if (typeof PasswordManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'js/PasswordManager.js';
        script.onload = function() {
            console.log('PasswordManager loaded for user administration');
            setupPasswordValidation();
        };
        script.onerror = function() {
            console.error('Failed to load PasswordManager.js');
        };
        document.head.appendChild(script);
    } else {
        setupPasswordValidation();
    }
});

/**
 * Setup password validation with PasswordManager
 */
function setupPasswordValidation() {
    const passwordField = document.getElementById('user-password');
    const strengthIndicator = document.getElementById('password-strength-indicator');
    
    if (passwordField && strengthIndicator && typeof PasswordManager !== 'undefined') {
        // Use PasswordManager for strength validation
        PasswordManager.setupPasswordField(passwordField, strengthIndicator);
        
        // Add custom strength indicator HTML if it doesn't exist
        if (!strengthIndicator.querySelector('.progress-bar')) {
            strengthIndicator.innerHTML = `
                <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; margin-top: 5px;">
                    <div class="progress-bar" style="height: 100%; border-radius: 2px; transition: all 0.3s ease; width: 0%;"></div>
                </div>
                <small class="strength-level" style="font-size: 12px; margin-top: 2px; display: block;"></small>
            `;
        }
    }
}

/**
 * Initializes the DataTable for user management and sets up all event handlers.
 * This function is called once the DOM is ready.
 */
function initializeDataTable() {
    // If a DataTable already exists on #users-table, destroy it to avoid duplicates
    if ($.fn.DataTable.isDataTable('#users-table')) {
        $('#users-table').DataTable().destroy();
    }
    
    // Initialize the DataTable with configuration for AJAX, columns, buttons, and language
    usersTable = $('#users-table').DataTable({
        ajax: {
            url: URLPF + 'dao/users/daoUserAdmin.php', 
            dataSrc: 'data', 
            complete: function() {
                // Close loading indicator when data is loaded
                Swal.close();
            },
            error: function(xhr, error, thrown) {
                // Show error alert if data loading fails
                Swal.fire({
                    icon: 'error',
                    title: 'Error Loading Data',
                    text: 'There was a problem loading the user data. Please try again.'
                });
                console.error('DataTables Ajax error:', error, thrown);
            }
        },
        columns: [
            { data: 'id' },           
            { data: 'name' },        
            { data: 'email' },
            { data: 'plant' },        
            { data: 'role' },        
            { 
                data: 'password',
                render: function(data, type, row) {
                    // NUEVO: Mostrar estado de encriptación con iconos
                    if (data.includes('🔐 Encrypted')) {
                        return '<span class="badge bg-success"><i class="fas fa-lock"></i> Encrypted</span>';
                    } else if (data.includes('⚠️ Plain text')) {
                        return '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle"></i> Plain Text</span>';
                    }
                    return data;
                }
            },     
            { data: 'authorization_level' }, 
            {
                data: null,
                sortable: false,
                render: function(data, type, row) {
                    // Render action buttons for edit and delete
                    return `
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-user icon-only-btn" data-id="${row.id}" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-user icon-only-btn" data-id="${row.id}" 
                                    ${row.id == window.userID ? 'disabled' : ''} title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        dom: 'Bfrtip', // Layout for DataTable controls (Buttons, Filter, Table, etc.)
        buttons: [
            {
                // Button to add a new user
                text: '<i class="fas fa-user-plus"></i>',
                className: 'btn-primary icon-only-btn',
                titleAttr: 'Add New User', // Tooltip
                action: function () {
                    // Clear the form and set it for a new user
                    $('#user-form').trigger('reset');
                    $('#user-id').val('New');
                    
                    // Clear password strength indicator
                    const strengthIndicator = document.getElementById('password-strength-indicator');
                    if (strengthIndicator) {
                        strengthIndicator.innerHTML = '';
                    }
                    
                    // Reset password placeholder
                    $('#user-password').attr('placeholder', 'Enter password');
                    
                    // Show the user form
                    $('#form-title').text('Add New User');
                    $('#user-form-container').removeClass('d-none');
                    
                    // Scroll to the form for better UX
                    $('#user-form-container')[0].scrollIntoView({ behavior: 'smooth' });
                }
            },
            {
                // Button to export users to Excel
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i>',
                className: 'btn-success icon-only-btn',
                titleAttr: 'Export to Excel',
                title: 'Users_Report',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 6]  // Include plant column, exclude password
                }
            },
            {
                // Button to export users to PDF
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i>',
                className: 'btn-danger icon-only-btn',
                titleAttr: 'Export to PDF',
                title: 'Users Report',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 6]  // Include plant column, exclude password
                }
            }
        ],
        order: [[0, 'desc']], // Default sort by ID descending
        responsive: true,     // Enable responsive table
        scrollX: true,        // Enable horizontal scrolling
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries per page",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        }
    });

    //=====================================================================================================
    // Handle Edit User button click in the table
    $('#users-table').on('click', '.edit-user', function() {
        const userId = $(this).data('id');
        const userData = usersTable.row($(this).closest('tr')).data();
        
        // Fill the form with the selected user's data
        $('#user-id').val(userData.id);
        $('#user-name').val(userData.name);
        $('#user-email').val(userData.email);
        $('#user-plant').val(userData.plant);
        
        // NUEVO: No llenar el campo de contraseña para evitar mostrar datos sensibles
        $('#user-password').val(''); // Limpiar campo de contraseña
        $('#user-password').attr('placeholder', 'Enter new password (leave empty to keep current)');
        
        // Clear password strength indicator
        const strengthIndicator = document.getElementById('password-strength-indicator');
        if (strengthIndicator) {
            strengthIndicator.innerHTML = '';
        }
        
        // Show the form for editing
        $('#form-title').text('Edit User');
        $('#user-form-container').removeClass('d-none');
        
        // Scroll to the form
        $('#user-form-container')[0].scrollIntoView({ behavior: 'smooth' });
        
        // Set the correct role and authorization level in the dropdown
        populateUserForm(userData);
    });

    // Handle Delete User button click in the table
    $('#users-table').on('click', '.delete-user', function() {
        const userId = $(this).data('id');
        const userData = usersTable.row($(this).closest('tr')).data();
        
        // Show confirmation dialog before deleting
        Swal.fire({
            title: 'Delete User',
            text: `Are you sure you want to delete ${userData.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Send DELETE request to the server
                fetch(URLPF + 'dao/users/daoUserAdmin.php', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: userId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: data.message
                        });
                        // Refresh the table after deletion
                        usersTable.ajax.reload();
                    } else {
                        throw new Error(data.message);
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.message || 'An error occurred while deleting the user'
                    });
                });
            }
        });
    });

    // Handle User Form submission for creating or updating a user
    $('#submitbtn').on('click', function(e) {
        e.preventDefault();

        console.log('Form submitted - Debug starting');

        // Gather form data
        const userId = $('#user-id').val();
        const isNewUser = userId === 'New';
        const password = $('#user-password').val().trim();
        const name = $('#user-name').val().trim();
        const email = $('#user-email').val().trim();
        const plant = $('#user-plant').val().trim();

        console.log('Form data gathered:', {
            userId,
            isNewUser,
            hasPassword: !!password,
            name,
            email,
            plant
        });

        // Basic validation
        if (!name) {
            Swal.fire({
                icon: 'error',
                title: 'Name Required',
                text: 'Please enter the user name'
            });
            return;
        }

        if (!email) {
            Swal.fire({
                icon: 'error',
                title: 'Email Required',
                text: 'Please enter the email address'
            });
            return;
        }

        if (!plant) {
            Swal.fire({
                icon: 'error',
                title: 'Plant Required',
                text: 'Please enter the plant'
            });
            return;
        }

        // Get the selected role and authorization level from the dropdown
        const roleLevelSelect = $('#user-role-level')[0];
        if (!roleLevelSelect || !roleLevelSelect.value) {
            Swal.fire({
                icon: 'error',
                title: 'Role Required',
                text: 'Please select a role and authorization level'
            });
            return;
        }

        const selectedValue = roleLevelSelect.value;
        const [authLevel, role] = selectedValue.split(':');

        console.log('Role data:', { selectedValue, authLevel, role });

        if (!authLevel || !role) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Role Selection',
                text: 'Please select a valid role and authorization level'
            });
            return;
        }

        // NUEVO: Validar contraseña con PasswordManager si se proporciona
        if (password && typeof PasswordManager !== 'undefined') {
            const passwordValidation = PasswordManager.validateStrength(password);
            console.log('Password validation:', passwordValidation);
            if (!passwordValidation.isValid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Password',
                    text: passwordValidation.message
                });
                return;
            }
        } else if (isNewUser && !password) {
            Swal.fire({
                icon: 'error',
                title: 'Password Required',
                text: 'Password is required for new users'
            });
            return;
        }

        // Build the user data object to send to the server
        const userData = {
            name: name,
            email: email,
            plant: plant,
            role: role,
            authorization_level: parseInt(authLevel)
        };

        console.log('Base userData:', userData);

        // NUEVO: Encriptar contraseña si se proporciona
        if (password) {
            if (typeof PasswordManager !== 'undefined') {
                try {
                    userData.password = PasswordManager.encrypt(password);
                    console.log('Password encrypted successfully');
                    console.log('Original length:', password.length);
                    console.log('Encrypted length:', userData.password.length);
                } catch (error) {
                    console.error('Password encryption failed:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Encryption Error',
                        text: 'Failed to encrypt password. Please try again.'
                    });
                    return;
                }
            } else {
                console.warn('PasswordManager not available, sending plain password');
                userData.password = password;
            }
        }

        // If updating, include the user ID
        if (!isNewUser) {
            userData.id = parseInt(userId);
        }

        // Debug: Log the data being sent (without showing actual password)
        console.log('Final userData to send:', {
            ...userData,
            password: userData.password ? `[ENCRYPTED - ${userData.password.length} chars]` : '[NO PASSWORD]'
        });

        // Show loading indicator while saving
        Swal.fire({
            title: isNewUser ? 'Creating User' : 'Updating User',
            html: `
                <div style="text-align: left;">
                    <p><i class="fas fa-user"></i> Processing user data...</p>
                    ${password ? '<p><i class="fas fa-shield-alt"></i> Encrypting password...</p>' : ''}
                    <p><i class="fas fa-database"></i> Saving to database...</p>
                </div>
            `,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Send the user data to the server (POST for new, PUT for update)
        const requestMethod = isNewUser ? 'POST' : 'PUT';
        const requestUrl = URLPF + 'dao/users/daoUserAdmin.php';
        
        console.log('Making request:', {
            method: requestMethod,
            url: requestUrl,
            bodyLength: JSON.stringify(userData).length
        });

        fetch(requestUrl, {
            method: requestMethod,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            console.log('Response received:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Server error response:', text);
                    let errorMessage;
                    try {
                        const jsonError = JSON.parse(text);
                        errorMessage = jsonError.message || 'Server error occurred';
                    } catch (e) {
                        errorMessage = `Server returned ${response.status}: ${text}`;
                    }
                    throw new Error(errorMessage);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Server response data:', data);
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>${data.message}</strong></p>
                            ${password ? '<p><i class="fas fa-shield-alt text-success"></i> Password encrypted successfully</p>' : ''}
                        </div>
                    `
                });
                
                // Hide the form after success
                $('#user-form-container').addClass('d-none');
                
                // Refresh the table to show changes
                usersTable.ajax.reload();
            } else {
                throw new Error(data.message || 'Operation failed');
            }
        })
        .catch(error => {
            console.error('Error saving user:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'An error occurred while saving the user'
            });
        });
    });
}

/**
 * Helper function to populate the user form with data for editing.
 * @param {Object} userData - The user data object from the DataTable row.
 */
function populateUserForm(userData) {
    // Set the combined role and auth level dropdown to match the user's current values
    const roleLevel = userData.authorization_level + ':' + userData.role;
    const roleLevelSelect = $('#user-role-level')[0];
    
    // Find and select the matching option in the dropdown
    for (let i = 0; i < roleLevelSelect.options.length; i++) {
        if (roleLevelSelect.options[i].value.startsWith(userData.authorization_level + ':')) {
            roleLevelSelect.selectedIndex = i;
            break;
        }
    }
}

/**
 * Initializes the page when DOM is ready
 * - Checks authorization level
 * - Sets up event handlers
 * - Initializes DataTable
 */
$(document).ready(function() {
    // Check if the user has admin privileges (authorizationLevel >= 1)
    if (window.authorizationLevel < 1) {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You need administrator privileges to access this page.',
            confirmButtonText: 'Go Back'
        }).then(() => {
            window.location.href = 'newOrder.php';
        });
        return;
    }

    // Show loading indicator while initializing
    Swal.fire({
        title: 'Loading Data',
        text: 'Please wait while we load the user management interface...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Initialize DataTable after a short delay (for UI smoothness)
    setTimeout(initializeDataTable, 100);
    
    // Password visibility toggle - CORREGIDO para usar el ID correcto
    $(document).on('click', '#password-toggle', function() {
        const passwordInput = $('#user-password');
        const icon = $(this);
        
        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
    
    // Cancel button for the form
    $(document).on('click', '#cancel-form', function() {
        $('#user-form-container').addClass('d-none');
    });
});

/**
 * Verificación de disponibilidad de la variable URLPF
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URLPF is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}