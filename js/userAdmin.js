// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\js\userAdmin.js
/**
 * User Administration - JavaScript functionality
 * This file handles the DataTable initialization and CRUD operations for users.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if the user has admin privileges
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

    // Initialize DataTable
    const usersTable = $('#users-table').DataTable({
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/users/daoUserAdmin.php',
            dataSrc: 'data'
        },
        columns: [
            { data: 'id' },
            { data: 'name' },
            { data: 'email' },
            { data: 'role' },
            { data: 'password' },
            { data: 'authorization_level' },
            {
                data: null,
                sortable: false,
                render: function(data, type, row) {
                    return `
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-user" data-id="${row.id}">
                                <ion-icon name="create-outline"></ion-icon> Edit
                            </button>
                            <button class="btn btn-sm btn-danger delete-user" data-id="${row.id}" ${row.id == window.userID ? 'disabled' : ''}>
                                <ion-icon name="trash-outline"></ion-icon> Delete
                            </button>
                        </div>
                    `;
                }
            }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                text: '<ion-icon name="person-add-outline"></ion-icon> Add User',
                className: 'btn-primary',
                action: function () {
                    // Clear form
                    document.getElementById('user-form').reset();
                    document.getElementById('user-id').value = 'New';
                    
                    // Show the form
                    document.getElementById('form-title').textContent = 'Add New User';
                    document.getElementById('user-form-container').classList.remove('d-none');
                    
                    // Scroll to form
                    document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
                }
            },
            {
                extend: 'excel',
                text: 'Excel',
                className: 'btn-success',
                title: 'Users_Report',
                exportOptions: {
                    columns: [0, 1, 2, 3, 5]  // Exclude password column
                }
            },
            {
                extend: 'pdf',
                text: 'PDF',
                className: 'btn-danger',
                title: 'Users Report',
                exportOptions: {
                    columns: [0, 1, 2, 3, 5]  // Exclude password column
                }
            }
        ],
        order: [[0, 'desc']],
        responsive: true,
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

    // Toggle password visibility
    document.querySelector('.toggle-password').addEventListener('click', function() {
        const passwordInput = document.getElementById('user-password');
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        const icon = this.querySelector('ion-icon');
        icon.setAttribute('name', type === 'password' ? 'eye-outline' : 'eye-off-outline');
    });

    // Handle Edit User button click
    $('#users-table').on('click', '.edit-user', function() {
        const userId = $(this).data('id');
        const userData = usersTable.row($(this).closest('tr')).data();
        
        // Fill form with user data
        document.getElementById('user-id').value = userData.id;
        document.getElementById('user-name').value = userData.name;
        document.getElementById('user-email').value = userData.email;
        document.getElementById('user-password').value = userData.password; // Changed to populate password
        
        // Show the form
        document.getElementById('form-title').textContent = 'Edit User';
        document.getElementById('user-form-container').classList.remove('d-none');
        
        // Scroll to form
        document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
        
        // Populate combined role and auth level dropdown
        populateUserForm(userData);
    });

    // Handle Delete User button click
    $('#users-table').on('click', '.delete-user', function() {
        const userId = $(this).data('id');
        const userData = usersTable.row($(this).closest('tr')).data();
        
        Swal.fire({
            title: 'Delete User',
            text: `Are you sure you want to delete ${userData.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Send delete request
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
                        // Refresh the table
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

    // Handle Add User button click
    document.getElementById('btnAddUser').addEventListener('click', function() {
        // Clear form
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = 'New';
        
        // Show the form
        document.getElementById('form-title').textContent = 'Add New User';
        document.getElementById('user-form-container').classList.remove('d-none');
        
        // Scroll to form
        document.getElementById('user-form-container').scrollIntoView({ behavior: 'smooth' });
    });

    // Handle Cancel button click
    document.getElementById('cancel-form').addEventListener('click', function() {
        document.getElementById('user-form-container').classList.add('d-none');
    });

    // Handle Form Submit
    document.getElementById('user-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const userId = document.getElementById('user-id').value;
        const isNewUser = userId === 'New';
        
        // Get the selected role and authorization level
        const roleLevelSelect = document.getElementById('user-role-level');
        const selectedValue = roleLevelSelect.value;
        const [authLevel, role] = selectedValue.split(':');
        
        const userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: role,
            password: document.getElementById('user-password').value,
            authorization_level: parseInt(authLevel)
        };
        
        // For update, add the ID
        if (!isNewUser) {
            userData.id = parseInt(userId);
        }
        
        // Show loading
        Swal.fire({
            title: isNewUser ? 'Creating User' : 'Updating User',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Send request to server
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
                
                // Hide the form
                document.getElementById('user-form-container').classList.add('d-none');
                
                // Refresh the table
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
});

// When loading user data for editing
function populateUserForm(userData) {
    // Set the combined role and auth level dropdown
    const roleLevel = userData.authorization_level + ':' + userData.role;
    const roleLevelSelect = document.getElementById('user-role-level');
    
    // Find and select the matching option
    for (let i = 0; i < roleLevelSelect.options.length; i++) {
        if (roleLevelSelect.options[i].value.startsWith(userData.authorization_level + ':')) {
            roleLevelSelect.selectedIndex = i;
            break;
        }
    }
}