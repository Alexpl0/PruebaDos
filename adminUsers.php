<?php
/**
 * adminUsers.php - User Administration Panel (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Manejar sesión y autenticación. auth_check se encargará de verificar el nivel de autorización.
require_once 'dao/users/auth_check.php';

// 2. Cargar dependencias específicas de la página
require_once 'dao/users/PasswordManager.php';

// 3. Incluir el inyector de contexto.
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
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <!-- Header will be loaded dynamically -->
    <div id="header-container"></div>
    
    <main id="main" class="container mt-4"> 
        <h1 class="my-4">User Administration</h1>
        
        <!-- Users Table -->
        <div class="card mb-4 shadow-sm">
            <div class="card-body">
                <table id="users-table" class="display table table-striped table-hover" style="width:100%">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Plant</th>
                            <th>Role</th>
                            <th>Password</th>
                            <th>Auth Level</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Table data will be loaded dynamically -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- User Form -->
        <div id="user-form-container" class="card mt-4 mb-4 d-none shadow-sm">
            <div class="card-body">
                <h2 id="form-title" class="mb-3">Add New User</h2>
                <form id="user-form">
                    <input type="hidden" id="user-id" value="New">
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="user-name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="user-name" required>
                        </div>
                        <div class="col-md-6">
                            <label for="user-email" class="form-label">Email</label>
                            <input type="email" class="form-control" id="user-email" required>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="user-plant" class="form-label">Plant</label>
                            <select class="form-select" id="user-plant" required>
                                <option value="" disabled selected>Select a plant</option>
                                <option value="3310">3310 - Tetla</option>
                                <option value="3330">3330 - QRO</option>
                                <option value="1640">1640 - Tupelo Automotive</option>
                                <option value="3510">3510 - Delphos</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label for="user-role-level" class="form-label">Role & Authorization Level</label>
                            <select class="form-select" id="user-role-level" required>
                                <option value="0:Worker">Worker</option>
                                <option value="1:Logistics Manager">Logistics Manager</option>
                                <option value="2:Controlling">Controlling</option>
                                <option value="3:Plant Manager">Plant Manager</option>
                                <option value="4:Senior Manager Logistics Division">Senior Manager Logistics Division</option>
                                <option value="5:Manager OPS Division">Manager OPS Division</option>
                                <option value="6:SR VP Regional">SR VP Regional</option>
                                <option value="7:Division Controlling Regional">Division Controlling Regional</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <label for="user-password" class="form-label">Password</label>
                            <div class="password-field-container">
                                <input type="password" id="user-password" class="form-control" placeholder="Enter password" style="padding-right: 45px;">
                                <i id="password-toggle" class="fas fa-eye-slash password-toggle"></i>
                            </div>
                            <div id="password-strength-indicator" class="password-strength-indicator"></div>
                            <div class="form-text">Password should be at least 8 characters long with letters and numbers.</div>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between">
                        <button type="button" id="cancel-form" class="btn btn-secondary">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitbtn">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <footer class="text-center py-3 mt-4 bg-light">
        <p class="mb-0">© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/header.js"></script>
    <script src="js/PasswordManager.js"></script>
    <script src="js/userAdmin.js"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
