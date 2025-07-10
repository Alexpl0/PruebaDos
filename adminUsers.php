<?php
/**
 * adminUsers.php - User Administration Panel (Refactored)
 * This version uses the centralized context injection system.
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
    
    <script src="js/config.js"></script>

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>
    
    <main id="main" class="container mt-4"> 
        <h1 class="my-4">User Administration</h1>
        
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
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <div id="user-form-container" class="card mt-4 mb-4 d-none">
            <div class="card-body">
                <h2 id="form-title" class="mb-3">Add New User</h2>
                <form id="user-form" novalidate>
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
                            <select class="form-select" id="user-plant">
                                <option value="">Regional (No Plant)</option>
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
                    
                    <div class="row mb-4" id="password-section">
                        <div class="col-md-6">
                            <label for="user-password" class="form-label">Password</label>
                            <div class="position-relative">
                                <input type="password" class="form-control" id="user-password" placeholder="Enter new password">
                                <button type="button" id="password-toggle" class="btn border-0 position-absolute end-0 top-50 translate-middle-y" style="background-color: transparent;">
                                    <i class="fas fa-eye-slash text-secondary"></i>
                                </button>
                            </div>
                            <div class="form-text">Required for new users. At least 8 characters, with letters and numbers.</div>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-end gap-2 mt-4">
                        <button type="button" id="cancel-form" class="btn btn-light border">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitbtn">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <footer class="text-center py-3 mt-4 bg-light">
        <p class="mb-0">© 2025 Grammer. All rights reserved.</p>
    </footer>

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
    
    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
