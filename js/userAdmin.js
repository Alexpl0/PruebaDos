/**
 * userAdmin.js - User Administration Interface
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Soporte para gestión de múltiples niveles de aprobación
 * - UI mejorada para asignación de approval_level por planta
 * - DEBUG: Logs detallados para troubleshooting
 */

let usersTable;
let currentEditingUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 userAdmin.js: DOM Content Loaded');
    // Esperar a que PF_CONFIG esté disponible
    waitForConfig().then(() => {
        console.log('✅ PF_CONFIG disponible:', window.PF_CONFIG);
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
            console.log('✅ Config ya disponible');
            resolve();
        } else {
            console.log('⏳ Esperando config...');
            const interval = setInterval(() => {
                if (window.PF_CONFIG?.app?.baseURL) {
                    console.log('✅ Config cargada');
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}

function initializeDataTable() {
    console.log('📊 Inicializando DataTable...');
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
                    console.log('➕ Botón Add User clickeado');
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
    console.log('✅ DataTable inicializada');
}

function setupEventListeners() {
    console.log('🎧 Configurando event listeners...');
    
    // Event delegation para botones de editar/eliminar
    $('#usersTable').on('click', '.edit-user', function() {
        const userId = parseInt($(this).data('id'));
        console.log('✏️ Botón Edit clickeado para usuario ID:', userId);
        editUser(userId);
    });
    
    $('#usersTable').on('click', '.delete-user', function() {
        const userId = parseInt($(this).data('id'));
        console.log('🗑️ Botón Delete clickeado para usuario ID:', userId);
        deleteUser(userId);
    });
    
    // Botones del modal
    $('#saveUserBtn').on('click', function() {
        console.log('💾 Botón Save clickeado');
        saveUser();
    });
    
    $('#cancelUserBtn').on('click', function() {
        console.log('❌ Botón Cancel clickeado');
        closeUserModal();
    });
    
    // Botón para agregar nivel de aprobación
    $('#addApprovalLevelBtn').on('click', function() {
        console.log('➕ Agregando fila de approval level');
        addApprovalLevelRow();
    });
    
    console.log('✅ Event listeners configurados');
}

async function loadUsers() {
    console.log('📥 Cargando usuarios...');
    console.log('URL:', `${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`);
    
    try {
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Datos recibidos:', data);

        if (data.success) {
            console.log(`✅ ${data.users.length} usuarios cargados`);
            console.log('Usuarios:', data.users);
            
            usersTable.clear();
            usersTable.rows.add(data.users);
            usersTable.draw();
            
            console.log('✅ Tabla actualizada');
        } else {
            console.error('❌ Error en respuesta:', data.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to load users'
            });
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

function showAddUserModal() {
    console.log('➕ Mostrando modal para nuevo usuario');
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
    console.log('✅ Modal mostrado');
}

function editUser(userId) {
    console.log('📝 Iniciando edición de usuario ID:', userId);
    
    // Obtener todos los datos de la tabla
    const allData = usersTable.rows().data().toArray();
    console.log('📊 Total usuarios en tabla:', allData.length);
    console.log('📊 Datos completos de la tabla:', allData);
    
    // Buscar el usuario específico
    const userData = allData.find(u => {
        console.log(`🔍 Comparando: ${u.id} (${typeof u.id}) === ${userId} (${typeof userId})`);
        return u.id == userId; // Usar == en lugar de === por si uno es string
    });
    
    console.log('🔍 Usuario encontrado:', userData);
    
    if (!userData) {
        console.error('❌ Usuario no encontrado en los datos de la tabla');
        console.error('IDs disponibles:', allData.map(u => u.id));
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'User not found in table data'
        });
        return;
    }
    
    currentEditingUser = userData;
    console.log('💾 Usuario actual guardado:', currentEditingUser);
    
    // Actualizar título del modal
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit me-2"></i>Edit User';
    console.log('✅ Título actualizado');
    
    // Llenar campos del formulario
    console.log('📝 Llenando campos del formulario...');
    document.getElementById('userId').value = userData.id;
    console.log('  ✓ userId:', userData.id);
    
    document.getElementById('userName').value = userData.name;
    console.log('  ✓ userName:', userData.name);
    
    document.getElementById('userEmail').value = userData.email;
    console.log('  ✓ userEmail:', userData.email);
    
    document.getElementById('userRole').value = userData.role;
    console.log('  ✓ userRole:', userData.role);
    
    document.getElementById('userPlant').value = userData.plant || '';
    console.log('  ✓ userPlant:', userData.plant || '(vacío)');
    
    document.getElementById('userAuthLevel').value = userData.authorization_level;
    console.log('  ✓ userAuthLevel:', userData.authorization_level);
    
    // Hacer el password opcional en edición
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').value = '';
    document.getElementById('passwordHint').textContent = 'Leave empty to keep current password';
    console.log('  ✓ Password configurado como opcional');
    
    // Limpiar y llenar niveles de aprobación
    const container = document.getElementById('approvalLevelsContainer');
    container.innerHTML = '';
    console.log('🔄 Container de approval levels limpiado');
    
    if (userData.approval_levels && userData.approval_levels.length > 0) {
        console.log(`📋 Cargando ${userData.approval_levels.length} approval levels:`, userData.approval_levels);
        userData.approval_levels.forEach((al, index) => {
            console.log(`  ➕ Agregando approval level ${index + 1}:`, al);
            addApprovalLevelRow(al.level, al.plant || '');
        });
    } else {
        console.log('ℹ️ No hay approval levels para este usuario');
    }
    
    // Mostrar el modal
    console.log('🎭 Mostrando modal...');
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
    console.log('✅ Modal de edición mostrado');
}

function addApprovalLevelRow(level = '', plant = '') {
    console.log(`➕ Agregando fila de approval level: level=${level}, plant=${plant}`);
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
    console.log(`✅ Fila agregada con ID: ${rowId}`);
}

function removeApprovalLevelRow(rowId) {
    console.log(`🗑️ Eliminando fila: ${rowId}`);
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        console.log('✅ Fila eliminada');
    } else {
        console.error('❌ Fila no encontrada');
    }
}

function collectApprovalLevels() {
    console.log('📋 Recopilando approval levels...');
    const approvalLevels = [];
    const rows = document.querySelectorAll('.approval-level-row');
    console.log(`  Encontradas ${rows.length} filas`);
    
    rows.forEach((row, index) => {
        const levelSelect = row.querySelector('.approval-level-select');
        const plantInput = row.querySelector('.approval-plant-input');
        
        const level = levelSelect.value;
        const plant = plantInput.value.trim();
        
        console.log(`  Fila ${index + 1}: level=${level}, plant=${plant}`);
        
        if (level) {
            approvalLevels.push({
                level: parseInt(level),
                plant: plant || null
            });
        }
    });
    
    console.log('✅ Approval levels recopilados:', approvalLevels);
    return approvalLevels;
}

async function saveUser() {
    console.log('💾 Guardando usuario...');
    
    // Recopilar datos del formulario
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const role = document.getElementById('userRole').value.trim();
    const plant = document.getElementById('userPlant').value.trim();
    const authLevel = document.getElementById('userAuthLevel').value;
    const approvalLevels = collectApprovalLevels();
    
    console.log('📦 Datos del formulario:', {
        userId,
        name,
        email,
        passwordLength: password.length,
        role,
        plant,
        authLevel,
        approvalLevels
    });
    
    // Validaciones básicas
    if (!name || !email || !role) {
        console.warn('⚠️ Campos requeridos faltantes');
        Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'Please fill in all required fields'
        });
        return;
    }
    
    if (!userId && !password) {
        console.warn('⚠️ Password requerido para nuevo usuario');
        Swal.fire({
            icon: 'warning',
            title: 'Password Required',
            text: 'Password is required for new users'
        });
        return;
    }
    
    if (password && password.length < 6) {
        console.warn('⚠️ Password muy corto');
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
        console.log('📝 Modo: EDITAR usuario ID', payload.id);
    } else {
        console.log('➕ Modo: CREAR nuevo usuario');
    }
    
    if (password) {
        payload.password = password;
        console.log('🔒 Password incluido en payload');
    }
    
    // Determinar método y URL
    const method = userId ? 'PUT' : 'POST';
    const url = `${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`;
    
    console.log('📡 Enviando request:', { method, url, payload });
    
    try {
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success) {
            console.log('✅ Usuario guardado exitosamente');
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: data.message,
                timer: 2000
            });
            
            closeUserModal();
            loadUsers();
        } else {
            console.error('❌ Error al guardar:', data.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message
            });
        }
    } catch (error) {
        console.error('❌ Error en request:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

async function deleteUser(userId) {
    console.log('🗑️ Intentando eliminar usuario ID:', userId);
    
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
        console.log('❌ Eliminación cancelada por usuario');
        return;
    }
    
    console.log('✅ Confirmación recibida, procediendo...');
    
    try {
        const url = `${window.PF_CONFIG.app.baseURL}/dao/users/daoUserAdmin.php`;
        const payload = { id: userId };
        
        console.log('📡 DELETE request:', { url, payload });
        
        const response = await fetch(url, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success) {
            console.log('✅ Usuario eliminado exitosamente');
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: data.message,
                timer: 2000
            });
            
            loadUsers();
        } else {
            console.error('❌ Error al eliminar:', data.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message
            });
        }
    } catch (error) {
        console.error('❌ Error en DELETE request:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server'
        });
    }
}

function closeUserModal() {
    console.log('🚪 Cerrando modal...');
    const modalElement = document.getElementById('userModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
        console.log('✅ Modal cerrado');
    } else {
        console.warn('⚠️ No se encontró instancia del modal');
    }
    
    currentEditingUser = null;
    document.getElementById('userForm').reset();
    console.log('🔄 Formulario reseteado');
}
