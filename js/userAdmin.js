// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\js\userAdmin.js
/**
 * User Administration - JavaScript functionality
 * This file handles the DataTable initialization and CRUD operations for users.
 */

// Global variable to store the DataTable instance
let usersTable;

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
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/users/daoUserAdmin.php', // Endpoint to fetch user data
            dataSrc: 'data', // The property in the response that contains the user array
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
            { data: 'id' },           // User ID
            { data: 'name' },         // User Name
            { data: 'email' },        // User Email
            { data: 'role' },         // User Role
            { data: 'password' },     // User Password (should be hashed or hidden in production)
            { data: 'authorization_level' }, // User Authorization Level
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
                    document.getElementById('user-form').reset();
                    document.getElementById('user-id').value = 'New';
                    
                    // Show the user form
                    document.getElementById('form-title').textContent = 'Add New User';
                    document.getElementById('user-form-container').classList.remove('d-none');
                    
                    // Scroll to the form for better UX
                    document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
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
                    columns: [0, 1, 2, 3, 5]  // Exclude password column from export
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
                    columns: [0, 1, 2, 3, 5]  // Exclude password column from export
                }
            }
        ],
        order: [[0, 'desc']], // Default sort by ID descending
        responsive: true,     // Enable responsive table
        language: {
            // Customization for DataTable language
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

    // Password visibility toggle for the user form
    document.querySelector('.toggle-password').addEventListener('click', function() {
        const passwordInput = document.getElementById('user-password');
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        // Change the icon depending on visibility
        const icon = this.querySelector('i');
        if (type === 'password') {
            icon.className = 'fas fa-eye';
        } else {
            icon.className = 'fas fa-eye-slash';
        }
    });

    // Handle Edit User button click in the table
    $('#users-table').on('click', '.edit-user', function() {
        const userId = $(this).data('id');
        const userData = usersTable.row($(this).closest('tr')).data();
        
        // Fill the form with the selected user's data
        document.getElementById('user-id').value = userData.id;
        document.getElementById('user-name').value = userData.name;
        document.getElementById('user-email').value = userData.email;
        document.getElementById('user-password').value = userData.password; // Populate password field
        
        // Show the form for editing
        document.getElementById('form-title').textContent = 'Edit User';
        document.getElementById('user-form-container').classList.remove('d-none');
        
        // Scroll to the form
        document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
        
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
                fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoUserAdmin.php', {
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

    // Handle Add User button click (outside DataTable buttons)
    document.getElementById('btnAddUser').addEventListener('click', function() {
        // Clear the form for a new user
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = 'New';
        
        // Show the form
        document.getElementById('form-title').textContent = 'Add New User';
        document.getElementById('user-form-container').classList.remove('d-none');
        
        // Scroll to the form
        document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
    });

    // Handle Cancel button click to hide the user form
    const cancelButton = document.getElementById('cancel-form');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            document.getElementById('user-form-container').classList.add('d-none');
        });
    } else {
        console.error('Cancel button not found in the DOM');
    }

    // Handle User Form submission for creating or updating a user
    document.getElementById('user-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Gather form data
        const userId = document.getElementById('user-id').value;
        const isNewUser = userId === 'New';
        
        // Get the selected role and authorization level from the dropdown
        const roleLevelSelect = document.getElementById('user-role-level');
        const selectedValue = roleLevelSelect.value;
        const [authLevel, role] = selectedValue.split(':');
        
        // Build the user data object to send to the server
        const userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: role,
            password: document.getElementById('user-password').value,
            authorization_level: parseInt(authLevel)
        };
        
        // If updating, include the user ID
        if (!isNewUser) {
            userData.id = parseInt(userId);
        }
        
        // Show loading indicator while saving
        Swal.fire({
            title: isNewUser ? 'Creating User' : 'Updating User',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Send the user data to the server (POST for new, PUT for update)
        fetch('https://grammermx.com/Jesus/PruebaDos/dao/users/daoUserAdmin.php', {
            method: isNewUser ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message
                });
                
                // Hide the form after success
                document.getElementById('user-form-container').classList.add('d-none');
                
                // Refresh the table to show changes
                usersTable.ajax.reload();
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'An error occurred while saving the user'
            });
        });
    });
}

/**
 * DOM Ready handler
 * Checks for admin privileges and initializes the DataTable and event handlers.
 */
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Set up Cancel button handler outside DataTable initialization
    const cancelButton = document.getElementById('cancel-form');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            document.getElementById('user-form-container').classList.add('d-none');
        });
    } else {
        console.error('Cancel button not found in the DOM');
    }
});

/**
 * Helper function to populate the user form with data for editing.
 * @param {Object} userData - The user data object from the DataTable row.
 */
function populateUserForm(userData) {
    // Set the combined role and auth level dropdown to match the user's current values
    const roleLevel = userData.authorization_level + ':' + userData.role;
    const roleLevelSelect = document.getElementById('user-role-level');
    
    // Find and select the matching option in the dropdown
    for (let i = 0; i < roleLevelSelect.options.length; i++) {
        if (roleLevelSelect.options[i].value.startsWith(userData.authorization_level + ':')) {
            roleLevelSelect.selectedIndex = i;
            break;
        }
    }
}