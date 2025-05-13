<?php
session_start();
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
    console.log("Auth Level: " + window.authorizationLevel);
    console.log("UserName: " + window.userName);
    console.log("UserID: " + window.userID);
</script>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Admin Users</title>
    
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
 
    <!-- Add Material Symbols -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/dataTables.css">
    <link rel="stylesheet" href="css/adminUsers.css">

    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">

    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div id="header-container"></div>
    
    <div id="mainOrders">
        <h1 id="title1">User Administration</h1>
        <button id="btnAddUser" class="btn btn-primary mb-4">Add New User</button>
    </div>

    <main id="main"> 
        <div class="container">
            <!-- Users DataTable -->
            <div class="table-responsive">
                <table id="users-table" class="table table-striped table-bordered" style="width:100%">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Password</th>
                            <th>Auth Level</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Data will be loaded here by DataTables -->
                    </tbody>
                </table>
            </div>

            <!-- Edit User Form -->
            <div id="user-form-container" class="card mt-4 mb-4 d-none">
                <div class="card-header">
                    <h3 id="form-title">Edit User</h3>
                </div>
                <div class="card-body">
                    <form id="user-form">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="user-id" class="form-label">ID</label>
                                <input type="text" class="form-control" id="user-id" readonly>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="user-name" class="form-label">Name</label>
                                <input type="text" class="form-control" id="user-name" required>
                            </div>
                        </div>
                        <div class="row" id="email-row">
                            <div class="col-md-6 mb-3">
                                <label for="user-email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="user-email" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="user-role-level" class="form-label">Role & Authorization Level</label>
                                <select class="form-select" id="user-role-level" required>
                                    <option value="0:Worker">0. Worker</option>
                                    <option value="1:Logistics Manager">1. Logistics Manager</option>
                                    <option value="2:Controlling">2. Controlling</option>
                                    <option value="3:Plant Manager">3. Plant Manager</option>   
                                    <option value="4:Senior Manager Logistics Division">4. Senior Manager Logistics Division</option>
                                    <option value="5:Manager OPS Division">5. Manager OPS Division</option>
                                    <option value="6:SR VP Regional">6. SR VP Regional</option>
                                    <option value="7:Division Controlling Regional">7. Division Controlling Regional</option>
                                </select>
                            </div>
                        </div>
                        <div class="row" id="password-row">
                            <div class="col-md-6 mb-3">
                                <label for="user-password" class="form-label">Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="user-password" required>
                                    <button class="btn btn-outline-secondary toggle-password" type="button">
                                        <span class="material-symbols-outlined">visibility</span>
                                    </button>
                                </div>
                                <small class="form-text text-muted">Leave unchanged to keep current password</small>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between">
                            <button type="button" id="cancel-form" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts necesarios -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="js/header.js"></script>

    <!-- jQuery y Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- DataTables JS -->
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>

    <!-- Custom script for user administration -->
    <script src="js/userAdmin.js"></script>
</body>
</html>