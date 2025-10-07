<?php
/**
 * adminUsers.php - User Administration Panel
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - UI actualizada para gestión de niveles de aprobación
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
    
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/adminUsers.css">
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="container-fluid mt-4">
        <div class="row">
            <div class="col-12">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">
                            <i class="fas fa-users-cog"></i> User Administration
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
    </div>

    <!-- Modal para Crear/Editar Usuario -->
    <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="userModalTitle">User Details</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <input type="hidden" id="userId">
                        
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

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="userRole" class="form-label">
                                    <i class="fas fa-briefcase"></i> Role <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" id="userRole" required>
                            </div>
                            <div class="col-md-6">
                                <label for="userPlant" class="form-label">
                                    <i class="fas fa-industry"></i> Plant
                                </label>
                                <input type="text" class="form-control" id="userPlant" placeholder="Leave empty if N/A">
                            </div>
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
                                       autocomplete="new-password">
                                <small class="text-muted">Min. 6 characters</small>
                            </div>
                        </div>

                        <hr>

                        <!-- NUEVO: Sección de Niveles de Aprobación -->
                        <div class="mb-3">
                            <label class="form-label fw-bold">
                                <i class="fas fa-check-circle"></i> Approval Levels
                            </label>
                            <p class="text-muted small mb-2">
                                Define which approval levels this user can perform, and for which plant(s). 
                                Leave plant empty to make the user a regional approver (can approve for any plant).
                            </p>
                            
                            <div id="approvalLevelsContainer">
                                <!-- Filas dinámicas de niveles de aprobación -->
                            </div>
                            
                            <button type="button" class="btn btn-sm btn-outline-success mt-2" id="addApprovalLevelBtn">
                                <i class="fas fa-plus"></i> Add Approval Level
                            </button>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelUserBtn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-primary" id="saveUserBtn">
                        <i class="fas fa-save"></i> Save User
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- CRÍTICO: Cargar config.js ANTES de userAdmin.js -->
    <script src="js/config.js"></script>
    <script src="js/userAdmin.js"></script>
</body>
</html>
