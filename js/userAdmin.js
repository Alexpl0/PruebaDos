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
    initializeDataTable();
    setupEventListeners();
    loadUsers();
});

function initializeDataTable() {
    usersTable = $('#usersTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel"></i> Export Excel',
                className: 'btn btn-success btn-sm'
            },
            {
                extend: 'pdfHtml5',
                text: '<i class="fas fa-file-pdf"></i> Export PDF',
                className: 'btn btn-danger btn-sm'
            },
            {
                text: '<i class="fas fa-user-plus"></i> Add User',
                className: 'btn btn-primary btn-sm',
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
        const userId = $(this).data('id');
        editUser(userId);
    });
    
    $('#usersTable').on('click', '.delete-user', function() {
        const userId = $(this).data('id');
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
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/users/daoUserAdmin.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            usersTable.clear();
            usersTable.rows.add(data.users);
            usersTable.draw();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error Loading Users',
                text: data.message || 'Failed to load users'
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to server'
        });
    }
}

function showAddUserModal() {
    currentEditingUser = null;
    
    document.getElementById('userModalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    
    // Limpiar niveles de aprobación
    document.getElementById('approvalLevelsContainer').innerHTML = '';
    
    $('#userModal').modal('show');
}

function editUser(userId) {
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
    
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = userData.id;
    document.getElementById('userName').value = userData.name;
    document.getElementById('userEmail').value = userData.email;
    document.getElementById('userRole').value = userData.role;
    document.getElementById('userPlant').value = userData.plant || '';
    document.getElementById('userAuthLevel').value = userData.authorization_level;
    
    // Contraseña opcional al editar
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').placeholder = 'Leave empty to keep current password';
    
    // NUEVO: Cargar niveles de aprobación
    const container = document.getElementById('approvalLevelsContainer');
    container.innerHTML = '';
    
    if (userData.approval_levels && userData.approval_levels.length > 0) {
        userData.approval_levels.forEach(al => {
            addApprovalLevelRow(al.level, al.plant);
        });
    }
    
    $('#userModal').modal('show');
}

function addApprovalLevelRow(level = '', plant = '') {
    const container = document.getElementById('approvalLevelsContainer');
    const rowId = `approval-row-${Date.now()}`;
    
    const rowHtml = `
        <div class="approval-level-row mb-2" id="${rowId}">
            <div class="row g-2">
                <div class="col-md-4">
                    <select class="form-select approval-level-select" required>
                        <option value="">Select Level</option>
                        <option value="1" ${level == 1 ? 'selected' : ''}>Level 1 - Trafico</option>
                        <option value="2" ${level == 2 ? 'selected' : ''}>Level 2 - Customs</option>
                        <option value="3" ${level == 3 ? 'selected' : ''}>Level 3 - Transport Specialist</option>
                        <option value="4" ${level == 4 ? 'selected' : ''}>Level 4 - Transport Manager</option>
                        <option value="5" ${level == 5 ? 'selected' : ''}>Level 5 - Plant Manager</option>
                        <option value="6" ${level == 6 ? 'selected' : ''}>Level 6 - Regional Director</option>
                        <option value="7" ${level == 7 ? 'selected' : ''}>Level 7 - VP Operations</option>
                        <option value="8" ${level == 8 ? 'selected' : ''}>Level 8 - CFO</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <input type="text" class="form-control approval-plant-input" 
                           placeholder="Plant (leave empty for REGIONAL)" 
                           value="${plant || ''}">
                    <small class="text-muted">Empty = Regional approver (all plants)</small>
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-danger btn-sm w-100 remove-approval-level" 
                            onclick="removeApprovalLevelRow('${rowId}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function removeApprovalLevelRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

function collectApprovalLevels() {
    const rows = document.querySelectorAll('.approval-level-row');
    const approvalLevels = [];
    
    rows.forEach(row => {
        const levelSelect = row.querySelector('.approval-level-select');
        const plantInput = row.querySelector('.approval-plant-input');
        
        if (levelSelect.value) {
            approvalLevels.push({
                level: parseInt(levelSelect.value),
                plant: plantInput.value.trim() || null
            });
        }
    });
    
    return approvalLevels;
}

async function saveUser() {
    const form = document.getElementById('userForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const userId = document.getElementById('userId').value;
    const isEditing = userId !== '';
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        role: document.getElementById('userRole').value.trim(),
        plant: document.getElementById('userPlant').value.trim() || null,
        authorization_level: parseInt(document.getElementById('userAuthLevel').value),
        approval_levels: collectApprovalLevels() // NUEVO
    };
    
    const password = document.getElementById('userPassword').value.trim();
    if (password) {
        userData.password = password;
    }
    
    if (isEditing) {
        userData.id = parseInt(userId);
    }
    
    try {
        Swal.fire({
            title: 'Saving User...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/users/daoUserAdmin.php`, {
            method: isEditing ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: isEditing ? 'User Updated!' : 'User Created!',
                text: data.message,
                timer: 2000
            });
            
            closeUserModal();
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to save user'
            });
        }
    } catch (error) {
        console.error('Error saving user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to server'
        });
    }
}

async function deleteUser(userId) {
    const userData = usersTable.rows().data().toArray().find(u => u.id === userId);
    
    if (!userData) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'User not found'
        });
        return;
    }
    
    const result = await Swal.fire({
        title: 'Delete User?',
        html: `Are you sure you want to delete user <strong>${userData.name}</strong>?<br><br>
               <span class="text-danger">This action cannot be undone!</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it!'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        Swal.fire({
            title: 'Deleting User...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/users/daoUserAdmin.php`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'User Deleted!',
                text: data.message,
                timer: 2000
            });
            
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to delete user'
            });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to server'
        });
    }
}

function closeUserModal() {
    $('#userModal').modal('hide');
    document.getElementById('userForm').reset();
    document.getElementById('approvalLevelsContainer').innerHTML = '';
    currentEditingUser = null;
}
