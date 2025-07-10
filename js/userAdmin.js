/**
 * User Administration - JavaScript functionality
 * This file handles the DataTable initialization and CRUD operations for users.
 * * Features:
 * - User listing with DataTable, filtered by the admin's plant or all for regional admins
 * - Add (with password), Edit (without password), Delete user operations
 * - Dynamic form for new vs. existing users
 * - Export to Excel and PDF with styled icon buttons
 * * @author Alejandro Perez
 * @version 4.0.0
 */

let usersTable;

function initializeDataTable() {
    if ($.fn.DataTable.isDataTable('#users-table')) {
        $('#users-table').DataTable().destroy();
    }
    
    usersTable = $('#users-table').DataTable({
        ajax: {
            url: PF_CONFIG.app.baseURL + 'dao/users/daoUserAdmin.php', 
            dataSrc: 'data', 
            error: function(xhr, error, thrown) {
                Swal.fire('Error', 'Could not load user data.', 'error');
            }
        },
        columns: [
            { data: 'id' },           
            { data: 'name' },        
            { data: 'email' },
            { data: 'plant' },        
            { data: 'role' },        
            {
                data: null,
                sortable: false,
                render: function(data, type, row) {
                    return `
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-user" data-id="${row.id}" title="Edit User"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger delete-user" data-id="${row.id}" ${row.id == PF_CONFIG.user.id ? 'disabled' : ''} title="Delete User"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }
            }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                text: '<i class="fas fa-user-plus"></i>',
                className: 'btn-primary dt-icon-btn',
                titleAttr: 'Add New User',
                action: function () {
                    $('#user-form').trigger('reset');
                    $('#user-id').val('New');
                    $('#form-title').text('Add New User');
                    $('#password-section').show();
                    $('#user-password').prop('required', true);
                    $('#user-form-container').removeClass('d-none');
                    $('#user-form-container')[0].scrollIntoView({ behavior: 'smooth' });
                }
            },
            { 
                extend: 'excel', 
                text: '<i class="fas fa-file-excel"></i>', 
                className: 'btn-success dt-icon-btn',
                titleAttr: 'Export to Excel',
                exportOptions: { columns: [0, 1, 2, 3, 4] } 
            },
            { 
                extend: 'pdf', 
                text: '<i class="fas fa-file-pdf"></i>', 
                className: 'btn-danger dt-icon-btn',
                titleAttr: 'Export to PDF',
                exportOptions: { columns: [0, 1, 2, 3, 4] } 
            }
        ],
        order: [[0, 'desc']],
        responsive: true,
        scrollX: true
    });
}

function populateUserForm(userData) {
    $('#user-id').val(userData.id);
    $('#user-name').val(userData.name);
    $('#user-email').val(userData.email);
    $('#user-plant').val(userData.plant);
    
    const roleLevel = `${userData.authorization_level}:${userData.role}`;
    $('#user-role-level').val(roleLevel);

    $('#form-title').text('Edit User');
    $('#password-section').hide();
    $('#user-password').prop('required', false);
    
    $('#user-form-container').removeClass('d-none');
    $('#user-form-container')[0].scrollIntoView({ behavior: 'smooth' });
}

function sendUserData(userData, method) {
    Swal.fire({
        title: method === 'POST' ? 'Creating User...' : 'Updating User...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    fetch(PF_CONFIG.app.baseURL + 'dao/users/daoUserAdmin.php', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Swal.fire('Success', data.message, 'success');
            $('#user-form-container').addClass('d-none');
            usersTable.ajax.reload();
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        Swal.fire('Error', error.message || 'An unknown error occurred.', 'error');
    });
}

$(document).ready(function() {
    if (PF_CONFIG.user.authorizationLevel < 1) {
        Swal.fire('Access Denied', 'You do not have permission to view this page.', 'error')
             .then(() => window.location.href = 'newOrder.php');
        return;
    }

    initializeDataTable();

    $('#users-table').on('click', '.edit-user', function() {
        const userData = usersTable.row($(this).closest('tr')).data();
        populateUserForm(userData);
    });

    $('#users-table').on('click', '.delete-user', function() {
        const userId = $(this).data('id');
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
        }).then(result => {
            if (result.isConfirmed) {
                sendUserData({ id: userId }, 'DELETE');
            }
        });
    });

    $('#submitbtn').on('click', function() {
        const isNewUser = $('#user-id').val() === 'New';
        const password = $('#user-password').val();
        
        if (isNewUser && (!password || password.length < 8)) {
            Swal.fire('Validation Error', 'Password is required and must be at least 8 characters long.', 'error');
            return;
        }

        const userData = {
            name: $('#user-name').val(),
            email: $('#user-email').val(),
            plant: $('#user-plant').val(),
            role: $('#user-role-level').val().split(':')[1],
            authorization_level: parseInt($('#user-role-level').val().split(':')[0])
        };

        if (isNewUser) {
            userData.password = password;
            sendUserData(userData, 'POST');
        } else {
            userData.id = parseInt($('#user-id').val());
            sendUserData(userData, 'PUT');
        }
    });

    $('#cancel-form').on('click', () => $('#user-form-container').addClass('d-none'));

    $('#password-toggle').on('click', function() {
        const passwordInput = $('#user-password');
        const icon = $(this).find('i');
        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
});
