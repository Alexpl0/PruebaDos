<?php
/**
 * adminUsers.php - User Administration Panel
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - UI actualizada para gestión de niveles de aprobación
 * - Integración visual consistente con el resto de la aplicación
 */
require_once 'dao/users/auth_check.php';
require_once 'dao/users/PasswordManager.php';
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="User administration panel for Premium Freight management system">
    <title>User Administration | Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- External CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/adminUsers.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <script src="js/config.js"></script>
</head>
<body>
    <!-- Header dinámico -->
    <div id="header-container"></div>

    <!-- Contenido Principal -->
    <main class="container-fluid mt-4 mb-5">
        <!-- Page Header -->
        <div class="page-header text-center mb-4">
            <h1 class="mb-2">
                <i class="fas fa-users-cog me-2"></i>
                USER ADMINISTRATION
            </h1>
            <p class="text-muted">Manage system users, roles, and approval levels</p>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">
                            <i class="fas fa-table me-2"></i> Users List
                        </h4>
                    </div>
                    <div class="card-body">
                        <table id="usersTable" class="display nowrap" style="width:100%">
                            <!-- DataTable se inicializa via JavaScript -->
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="text-center py-3">
        <p>&copy; 2025 GRAMMER Automotive Puebla S.A. de C.V. - All rights reserved.</p>
    </footer>

    <!-- Modal para Crear/Editar Usuario -->
    <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="userModalTitle">
                        <i class="fas fa-user-edit me-2"></i>User Details
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <input type="hidden" id="userId">
                        
                        <!-- Sección: Información Personal -->
                        <div class="section-header">
                            <h5 class="text-primary">
                                <i class="fas fa-id-card me-2"></i>Personal Information
                            </h5>
                            <hr>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="userName" class="form-label">
                                    <i class="fas fa-user"></i> Full Name <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" id="userName" required>
                            </div>
                            <div class="col-md-6">
                                <label for="userEmail" class="form-label">
                                    <i class="fas fa-envelope"></i> Email <span class="text-danger">*</span>
                                </label>
                                <input type="email" class="form-control" id="userEmail" required>
                            </div>
                        </div>

                        <!-- Sección: Rol y Ubicación -->
                        <div class="section-header mt-4">
                            <h5 class="text-primary">
                                <i class="fas fa-briefcase me-2"></i>Role & Location
                            </h5>
                            <hr>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="userRole" class="form-label">
                                    <i class="fas fa-briefcase"></i> Role <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" id="userRole" 
                                       placeholder="e.g., Traffic Manager, Customs Specialist" required>
                            </div>
                            <div class="col-md-6">
                                <label for="userPlant" class="form-label">
                                    <i class="fas fa-industry"></i> Plant
                                </label>
                                <input type="text" class="form-control" id="userPlant" 
                                       placeholder="Leave empty if not plant-specific">
                                <small class="text-muted">Optional - for plant-specific users</small>
                            </div>
                        </div>

                        <!-- Sección: Seguridad -->
                        <div class="section-header mt-4">
                            <h5 class="text-primary">
                                <i class="fas fa-shield-alt me-2"></i>Security & Access
                            </h5>
                            <hr>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="userAuthLevel" class="form-label">
                                    <i class="fas fa-shield-alt"></i> Authorization Level <span class="text-danger">*</span>
                                </label>
                                <select class="form-select" id="userAuthLevel" required>
                                    <option value="0">0 - No Access</option>
                                    <option value="1">1 - Basic User</option>
                                    <option value="2">2 - Advanced User</option>
                                    <option value="3">3 - Supervisor</option>
                                    <option value="4">4 - Manager</option>
                                    <option value="5">5 - Director</option>
                                    <option value="6">6 - VP</option>
                                    <option value="7">7 - Executive</option>
                                    <option value="8">8 - Admin</option>
                                </select>
                                <small class="text-muted">Controls page access and UI permissions</small>
                            </div>
                            <div class="col-md-6" id="passwordGroup">
                                <label for="userPassword" class="form-label">
                                    <i class="fas fa-lock"></i> Password <span class="text-danger">*</span>
                                </label>
                                <input type="password" 
                                       class="form-control" 
                                       id="userPassword"
                                       autocomplete="new-password"
                                       placeholder="Min. 6 characters">
                                <small class="text-muted" id="passwordHint">Min. 6 characters</small>
                            </div>
                        </div>

                        <!-- Sección: Niveles de Aprobación -->
                        <div class="section-header mt-4">
                            <h5 class="text-primary">
                                <i class="fas fa-check-circle me-2"></i>Approval Levels
                            </h5>
                            <hr>
                        </div>

                        <div class="mb-3">
                            <div class="alert alert-info" role="alert">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>How it works:</strong> Define which approval levels this user can perform. 
                                Leave plant empty to make the user a regional approver (can approve for any plant).
                            </div>
                            
                            <div id="approvalLevelsContainer" class="mb-3">
                                <!-- Filas dinámicas de niveles de aprobación -->
                            </div>
                            
                            <button type="button" class="btn btn-sm btn-outline-success" id="addApprovalLevelBtn">
                                <i class="fas fa-plus me-1"></i> Add Approval Level
                            </button>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelUserBtn">
                        <i class="fas fa-times me-1"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-primary" id="saveUserBtn">
                        <i class="fas fa-save me-1"></i> Save User
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Header dinámico -->
    <script src="js/header.js" type="module"></script>
    
    <!-- User Admin Script -->
    <script src="js/userAdmin.js"></script>
</body>
</html>
