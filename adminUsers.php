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
     
    <!-- jQuery first to ensure availability for other scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Ion Icons  -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    
    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">

    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/dataTables.css">
    <link rel="stylesheet" href="css/adminUsers.css">
</head>
<body>
    <div id="header-container"></div>

    <main id="main"> 
        <div class="container">
            <h1 class="mb-4">User Administration</h1>
            
            <!-- Users Table -->
            <div class="card mb-4">
                <div class="card-body">
                    <table id="users-table" class="display" style="width:100%">
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
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- User Form -->
            <div id="user-form-container" class="card mt-4 mb-4 d-none">
                <div class="card-body">
                    <h2 id="form-title">Add New User</h2>
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
                            <div class="col-md-6">
                                <label for="user-password" class="form-label">Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="user-password" required>
                                    <button class="btn btn-outline-secondary toggle-password" type="button">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between">
                            <button type="button" id="cancel-form" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="submitbtn">Save User</button>
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


    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>

    <!-- Custom script for user administration -->
    <script src="js/userAdmin.js"></script>

</body>
</html>