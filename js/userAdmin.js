/**
 * userAdmin.js - User Administration Interface
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Soporte para gestión de múltiples niveles de aprobación
 * - UI mejorada para asignación de approval_level por planta
 */

let usersTable;
let currentEditingUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que PF_CONFIG esté disponible
    waitForConfig().then(() => {
        initializeDataTable();
        setupEventListeners();
        loadUsers();
    });
});

/**
 * Espera a que window.PF_CONFIG esté disponible
 */
function waitForConfig() {
    return new Promise((resolve) => {
        if (window.PF_CONFIG?.app?.baseURL) {
            resolve();
        } else {
            const interval = setInterval(() => {
                if (window.PF_CONFIG?.app?.baseURL) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}

function initializeDataTable() {
    usersTable = $('#usersTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel"></i>',
                className: 'btn btn-success btn-sm dt-icon-btn',
                title: 'Users Export',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5]
                }
            },
            {
                extend: 'pdfHtml5',
                text: '<i class="fas fa-file-pdf"></i>',
                className: 'btn btn-danger btn-sm dt-icon-btn',
                title: 'Users Export',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5]
                }
            },
            {
                text: '<i class="fas fa-user-plus"></i>',
                className: 'btn btn-primary btn-sm dt-icon-btn',
                titleAttr: 'Add New User',
                action: function() {
                    showAddUserModal();
                }
            }
        ],
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Name' },
            { data: 'email', title: 'Email' },
            { data: 'role', title: 'Role' },
            { 
                data: 'plant', 
                title: 'Plant',
                render: function(data) {
                    return data || '<span class="badge bg-secondary">N/A</span>';
                }
            },
            { 
                data: 'authorization_level', 
                title: 'Auth Level',
                render: function(data) {
                    return `<span class="badge bg-info">${data}</span>`;
                }
            },
            {
                data: 'approval_levels',
                title: 'Approval Levels',
                render: function(data) {
                    if (!data || data.length === 0) {
                        return '<span class="badge bg-secondary">None</span>';
                    }
                    
                    let badges = data.map(al => {
                        let plantLabel = al.plant ? al.plant : 'REGIONAL';
                        let color = al.plant ? 'bg-success' : 'bg-warning';
                        return `<span class="badge ${color} me-1">L${al.level}:${plantLabel}</span>`;
                    });
                    
                    return badges.join('');
                }
            },
            {
                data: null,
                title: 'Actions',
                orderable: false,
                render: function(data, type, row) {
                    return `
                        <button class="btn btn-sm btn-warning edit-user" data-id="${row.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-user" data-id="${row.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    `;
                }
            }
        ],
        order: [[1, 'asc']],
        pageLength: 25,
        responsive: true,
        language: {
            search: "Search users:",
            lengthMenu: "Show _MENU_ users per page",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        }
    });
}

function setupEventListeners() {
    // Event delegation para botones de editar/eliminar
    $('#usersTable').on('click', '.edit-user', function() {
        const userId = parseInt($(this).data('id'));
        editUser(userId);
    });
    
    $('#usersTable').on('click', '.delete-user', function() {
        const userId = parseInt($(this).data('id'));
        deleteUser(userId);
    });
    
    // Botones del modal
    $('#saveUserBtn').on('click', saveUser);
    $('#cancelUserBtn').on('click', closeUserModal);
    
    // Botón para agregar nivel de aprobación
    $('#addApprovalLevelBtn').on('click', addApprovalLevelRow);
}

async function loadUsers() {
    try {
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            usersTable.clear();
            usersTable.rows.add(data.users);
            usersTable.draw();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to load users'
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

function showAddUserModal() {
    currentEditingUser = null;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus me-2"></i>Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordHint').textContent = 'Min. 6 characters (Required)';
    
    // Limpiar niveles de aprobación
    document.getElementById('approvalLevelsContainer').innerHTML = '';
    
    // Mostrar el modal usando Bootstrap 5
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

function editUser(userId) {
    // Buscar el usuario en los datos de la tabla
    const userData = usersTable.rows().data().toArray().find(u => u.id === userId);
    
    if (!userData) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'User not found'
        });
        return;
    }
    
    currentEditingUser = userData;
    
    // Actualizar título del modal
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit me-2"></i>Edit User';
    
    // Llenar campos del formulario
    document.getElementById('userId').value = userData.id;
    document.getElementById('userName').value = userData.name;
    document.getElementById('userEmail').value = userData.email;
    document.getElementById('userRole').value = userData.role;
    document.getElementById('userPlant').value = userData.plant || '';
    document.getElementById('userAuthLevel').value = userData.authorization_level;
    
    // Hacer el password opcional en edición
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').value = '';
    document.getElementById('passwordHint').textContent = 'Leave empty to keep current password';
    
    // Limpiar y llenar niveles de aprobación
    const container = document.getElementById('approvalLevelsContainer');
    container.innerHTML = '';
    
    if (userData.approval_levels && userData.approval_levels.length > 0) {
        userData.approval_levels.forEach(al => {
            addApprovalLevelRow(al.level, al.plant || '');
        });
    }
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

function addApprovalLevelRow(level = '', plant = '') {
    const container = document.getElementById('approvalLevelsContainer');
    const rowId = 'approval-row-' + Date.now();
    
    const rowHTML = `
        <div class="approval-level-row mb-3" id="${rowId}">
            <div class="row align-items-center">
                <div class="col-md-5">
                    <label class="form-label">
                        <i class="fas fa-layer-group"></i> Approval Level
                    </label>
                    <select class="form-select approval-level-select">
                        <option value="">Select level...</option>
                        <option value="1" ${level == 1 ? 'selected' : ''}>Level 1 - Supervisor</option>
                        <option value="2" ${level == 2 ? 'selected' : ''}>Level 2 - Manager</option>
                        <option value="3" ${level == 3 ? 'selected' : ''}>Level 3 - Director</option>
                        <option value="4" ${level == 4 ? 'selected' : ''}>Level 4 - VP</option>
                        <option value="5" ${level == 5 ? 'selected' : ''}>Level 5 - Executive</option>
                    </select>
                </div>
                <div class="col-md-5">
                    <label class="form-label">
                        <i class="fas fa-industry"></i> Plant (Optional)
                    </label>
                    <input type="text" 
                           class="form-control approval-plant-input" 
                           placeholder="Leave empty for REGIONAL"
                           value="${plant}">
                    <small class="text-muted">Empty = Regional approver</small>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button type="button" 
                            class="btn btn-sm btn-danger w-100" 
                            onclick="removeApprovalLevelRow('${rowId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHTML);
}

function removeApprovalLevelRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

function collectApprovalLevels() {
    const approvalLevels = [];
    const rows = document.querySelectorAll('.approval-level-row');
    
    rows.forEach(row => {
        const levelSelect = row.querySelector('.approval-level-select');
        const plantInput = row.querySelector('.approval-plant-input');
        
        const level = levelSelect.value;
        const plant = plantInput.value.trim();
        
        if (level) {
            approvalLevels.push({
                level: parseInt(level),
                plant: plant || null
            });
        }
    });
    
    return approvalLevels;
}

async function saveUser() {
    // Recopilar datos del formulario
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const role = document.getElementById('userRole').value.trim();
    const plant = document.getElementById('userPlant').value.trim();
    const authLevel = document.getElementById('userAuthLevel').value;
    const approvalLevels = collectApprovalLevels();
    
    // Validaciones básicas
    if (!name || !email || !role) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'Please fill in all required fields'
        });
        return;
    }
    
    if (!userId && !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Password Required',
            text: 'Password is required for new users'
        });
        return;
    }
    
    if (password && password.length < 6) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid Password',
            text: 'Password must be at least 6 characters'
        });
        return;
    }
    
    // Construir payload
    const payload = {
        name,
        email,
        role,
        plant: plant || null,
        authorization_level: parseInt(authLevel),
        approval_levels: approvalLevels
    };
    
    if (userId) {
        payload.id = parseInt(userId);
    }
    
    if (password) {
        payload.password = password;
    }
    
    // Determinar método y URL
    const method = userId ? 'PUT' : 'POST';
    const url = `${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`;
    
    try {
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: data.message,
                timer: 2000
            });
            
            closeUserModal();
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message
            });
        }
    } catch (error) {
        console.error('Error saving user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: data.message,
                timer: 2000
            });
            
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message
            });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

function closeUserModal() {
    const modalElement = document.getElementById('userModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    
    currentEditingUser = null;
    document.getElementById('userForm').reset();
}
